# API Test Report — Restful Booker

This report documents the five endpoints in the required chained workflow:

`POST /auth` → `POST /booking` → `PUT /booking/:id` → `GET /booking/:id` → `DELETE /booking/:id`

Each section records the request, the observed response, the assertions that protect the workflow, a short analysis, and at least one high-quality negative scenario.

| Item | Detail |
| --- | --- |
| Target | `https://restful-booker.herokuapp.com` |
| API documentation | <https://restful-booker.herokuapp.com/apidoc/index.html> |
| Test artifact | `postman/RestfulBooker.postman_collection.json` |
| Environment | `postman/RestfulBooker.postman_environment.json` |
| Runner | Official Postman CLI (`npm test`) or Postman GUI |
| Latest local result | **15 requests, 77 assertions, 0 failures** |
| Evidence for defects | [`docs/evidence/defect-probe.log`](evidence/defect-probe.log) |
| Defect details | [`docs/BUG_REPORTS.md`](BUG_REPORTS.md) |

> All examples below are sanitized. Auth tokens are ephemeral and are never written to this report or to CI artifacts.

---

## 1. `POST /auth` — generate an authentication token

### Request details

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `{{baseUrl}}/auth` |
| Headers | `Content-Type: application/json`, `Accept: application/json` |
| Body | `{"username":"admin","password":"password123"}` (public sandbox credentials) |
| Pre-request | Clears any stale `token`, `bookingId`, and payload variables so a failed run cannot reuse earlier state. |
| Purpose | Obtain the token required by `PUT` and `DELETE`. |

### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | `{"token":"<ephemeral token>"}` |
| Chained state | `token` is stored in a collection variable and injected into `Cookie: token=<token>` on protected requests. |

### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the auth-token JSON Schema (required, non-empty `token`).
- Token is present and non-empty.
- Token is stored in an ephemeral collection variable (not logged, not committed).

### Short analysis

The happy path works: valid sandbox credentials return a token, and the token is successfully used by the downstream `PUT` and `DELETE` requests. The endpoint follows the documented contract for valid input. However, its error handling is weak: missing credentials return `200 OK` with `{"reason":"Bad credentials"}` instead of a `4xx` status. That behavior is asserted as an observed quirk in the regression suite and is raised as a defect because it makes authentication failure indistinguishable from success to status-code-only clients.

### Negative scenarios

| ID | Scenario | Expected | Actual / suite result |
| --- | --- | --- | --- |
| NEG-AUTH-01 | Wrong password | `401 Unauthorized` (or documented `200` + `reason`), and **no token** | `200 OK` + `{"reason":"Bad credentials"}`, no token. Asserted and passing. See BUG-01. |
| NEG-AUTH-02 | Missing username/password (`{}`) | `400 Bad Request` | `200 OK` + `{"reason":"Bad credentials"}`. Documented in BUG-01. |
| NEG-AUTH-03 | Malformed JSON (`{"username":`) | `400 Bad Request`, `text/plain` | `400 Bad Request`, body `Bad Request`. Asserted and passing. |

The suite keeps NEG-AUTH-01/02 behavior visible without encoding the defective status as the *desired* contract: the test names and descriptions explicitly call out the quirk, and the formal defect record states the expected behavior.

---

## 2. `POST /booking` — create a booking

### Request details

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `{{baseUrl}}/booking` |
| Headers | `Content-Type: application/json`, `Accept: application/json` |
| Body (dynamic) | A unique `QA_<run-suffix>` booking with `firstname`, `lastname`, `totalprice`, `depositpaid`, `bookingdates.checkin`, `bookingdates.checkout`, and `additionalneeds`. |
| Pre-request | Clears stale `bookingId`, builds a run-unique payload, and stores the expected values for later comparison. |
| Purpose | Create test data and extract the generated `bookingid`. |

### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | `{"bookingid":<positive integer>,"booking":{...}}` |
| Chained state | `bookingId` and the submitted payload variables are stored for `PUT`, `GET`, and `DELETE`. |

### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the create-booking JSON Schema.
- `bookingid` is a positive integer.
- Every submitted field is echoed with the correct value (additive response fields are tolerated).
- The payload is run-specific (`QA_` prefix derived from the current run).
- `bookingId` is persisted for downstream requests.

### Short analysis

Creation and dynamic extraction work correctly for valid data, and the run-unique payload prevents collisions in the shared sandbox. The critical weakness is input validation: missing or `null` required fields produce `500 Internal Server Error`, non-numeric and negative prices are accepted, and invalid dates are silently normalized to `"0NaN-aN-aN"`. A client can therefore create corrupt bookings that later consumers cannot trust. These are the highest-impact defects found in this assessment.

### Negative scenarios

| ID | Scenario | Expected | Actual |
| --- | --- | --- | --- |
| NEG-CREATE-01 | Malformed JSON (`{"firstname":`) | `400 Bad Request` | `400 Bad Request`, `text/plain`. Asserted and passing. |
| NEG-CREATE-02 | Empty object `{}` | `400 Bad Request` with field errors | `500 Internal Server Error`. See BUG-02. |
| NEG-CREATE-03 | Missing `firstname` | `400 Bad Request` | `500 Internal Server Error`. See BUG-02. |
| NEG-CREATE-04 | `"totalprice":"not-a-number"` | `400 Bad Request` | `200 OK`; stored as `totalprice: null`. See BUG-03. |
| NEG-CREATE-05 | `"totalprice":-100` | `400 Bad Request` | `200 OK`; negative price stored. See BUG-04. |
| NEG-CREATE-06 | Invalid date strings | `400 Bad Request` | `200 OK`; dates stored as `"0NaN-aN-aN"`. See BUG-05. |
| NEG-CREATE-07 | All required fields `null` | `400 Bad Request` | `500 Internal Server Error`. See BUG-02. |

The malformed-JSON case is part of the green regression suite. The semantic validation cases are reproduced by the separate defect probe so the main suite stays deterministic and does not depend on asserting defective behavior as correct.

---

## 3. `PUT /booking/:id` — replace a booking

### Request details

| Field | Value |
| --- | --- |
| Method | `PUT` |
| URL | `{{baseUrl}}/booking/{{bookingId}}` |
| Headers | `Content-Type: application/json`, `Accept: application/json`, `Cookie: token={{token}}` |
| Body (dynamic) | A second unique payload with changed `firstname`, `lastname`, `totalprice`, `depositpaid`, dates, and `additionalneeds`. |
| Pre-request | Fails fast if `bookingId` or `token` is missing; stores the expected update values. |
| Purpose | Prove authenticated replacement using the token and id extracted earlier. |

### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | The updated booking object. |
| Chained state | Expected update values are retained so the following `GET` can verify persistence independently. |

### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the booking JSON Schema.
- Every submitted update field is echoed with the correct value (additive fields tolerated).
- Specific business fields are correct (name, price, deposit flag, dates, additional needs).
- The update differs from the original create payload, proving the request actually changed state.

### Short analysis

The authorized update works and genuinely changes persisted state; the independent `GET` in the next step confirms it. Authorization is also enforced: both a missing token and an invalid token return `403 Forbidden`, and a read-after-rejection check proves the rejected payloads did not persist. Input validation is inconsistent with `POST /booking`: empty and partial payloads correctly return `400 Bad Request` and leave the record unchanged, while create accepts equivalently invalid data. That inconsistency is useful evidence for the bug reports.

### Negative scenarios

| ID | Scenario | Expected | Actual |
| --- | --- | --- | --- |
| NEG-PUT-01 | No auth cookie | `403 Forbidden`, no mutation | `403 Forbidden`, `text/plain`, no mutation. Asserted and passing. |
| NEG-PUT-02 | Invalid token | `403 Forbidden`, no mutation | `403 Forbidden`, `text/plain`, no mutation. Asserted and passing. |
| NEG-PUT-03 | Empty object with valid token | `400 Bad Request`, state unchanged | `400 Bad Request`, state unchanged. Confirmed by probe. |
| NEG-PUT-04 | Partial payload with valid token | `400 Bad Request`, state unchanged | `400 Bad Request`, state unchanged. Confirmed by probe. |

Both unauthorized attempts use a sentinel payload (`QA_SHOULD_NOT_PERSIST_<suffix>`, price `999`). The subsequent `GET` asserts the sentinel is absent and the last authorized values are still present.

---

## 4. `GET /booking/:id` — verify the persisted booking

### Request details

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `{{baseUrl}}/booking/{{bookingId}}` |
| Headers | `Accept: application/json` |
| Body | None |
| Pre-request | Fails fast if `bookingId` is missing. |
| Purpose | Independently read the record after `PUT` and prove the update persisted. |

### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | The persisted booking object. |

### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the booking JSON Schema.
- Every updated field matches the value submitted in `PUT` (additive fields tolerated).
- Updated values survive a fresh `GET`.
- Original create values are no longer present.

### Short analysis

This is the independent verification step. It does not trust the `PUT` response; it re-reads the resource and compares it with the payload the test sent. The check passes, so the update is genuinely persisted. The same technique is used after rejected writes/deletes, where the suite proves unauthorized requests had no side effects.

### Negative scenarios

| ID | Scenario | Expected | Actual |
| --- | --- | --- | --- |
| NEG-GET-01 | Unknown id `999999999` | `404 Not Found`, `text/plain` | `404 Not Found`, body `Not Found`. Asserted and passing. |
| NEG-GET-02 | Read after rejected `PUT`/`DELETE` | Last authorized state intact | State intact; sentinel absent. Asserted and passing. |

---

## 5. `DELETE /booking/:id` — remove test data

### Request details

| Field | Value |
| --- | --- |
| Method | `DELETE` |
| URL | `{{baseUrl}}/booking/{{bookingId}}` |
| Headers | `Accept: application/json`, `Cookie: token={{token}}` |
| Body | None |
| Pre-request | Fails fast if `bookingId` or `token` is missing. |
| Purpose | Clean up the created booking and confirm removal. |

### Response details

| Field | Value |
| --- | --- |
| Status | `201 Created` |
| Content-Type | `text/plain; charset=utf-8` |
| Body | `Created` |

A follow-up `GET` returns `404 Not Found`, proving the record was removed.

### Assertions

- Status is `201`.
- Content-Type is `text/plain`.
- Body is `Created`.
- Follow-up `GET` returns `404`.
- `token`, `bookingId`, and payload expectations are cleared from runtime variables.

### Short analysis

Authenticated deletion works and cleanup is verified by an independent read. Two error-handling issues remain: deleting an unknown id returns `405 Method Not Allowed` instead of `404 Not Found`, and deleting the same id twice returns `405`, so the operation is not idempotent. The suite avoids double-delete assertions in CI and records both behaviors as defects.

### Negative scenarios

| ID | Scenario | Expected | Actual |
| --- | --- | --- | --- |
| NEG-DELETE-01 | No auth cookie | `403 Forbidden`, record still exists | `403 Forbidden`, record still exists. Asserted and passing. |
| NEG-DELETE-02 | Unknown id with valid token | `404 Not Found` | `405 Method Not Allowed`. See BUG-06. |
| NEG-DELETE-03 | Delete the same id twice | `404 Not Found` on the second call (idempotent) | `405 Method Not Allowed`. See BUG-07. |

---

## Coverage summary

| Endpoint | Happy path | Schema | Negative coverage | Defects raised |
| --- | --- | --- | --- | --- |
| `POST /auth` | Yes | Yes | Wrong password, empty body, malformed JSON | BUG-01 |
| `POST /booking` | Yes | Yes | Malformed JSON, empty/missing/null fields, wrong type, negative price, invalid dates | BUG-02, BUG-03, BUG-04, BUG-05 |
| `PUT /booking/:id` | Yes | Yes | No token, invalid token, empty payload, partial payload | None (behaves correctly) |
| `GET /booking/:id` | Yes | Yes | Unknown id, read-after-rejection | None |
| `DELETE /booking/:id` | Yes | N/A (`text/plain`) | No token, unknown id, repeated delete | BUG-06, BUG-07 |

## How to reproduce

```bash
npm ci
npm test           # 15 requests, 77 assertions, 0 failures
npm run probe:defects   # reproduces the defects above; prints no tokens
```

The probe creates its own bookings and deletes them on completion. Its sanitized output is stored in [`docs/evidence/defect-probe.log`](evidence/defect-probe.log).
