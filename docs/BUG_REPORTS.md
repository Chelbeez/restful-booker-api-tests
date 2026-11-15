# Bug Reports — Restful Booker API

These defects were reproduced against the public sandbox at `https://restful-booker.herokuapp.com` on **15 November 2026**.

| Item | Detail |
| --- | --- |
| Environment | Public Restful Booker sandbox (shared, stateful) |
| API documentation | <https://restful-booker.herokuapp.com/apidoc/index.html> |
| Evidence | [`docs/evidence/defect-probe.log`](evidence/defect-probe.log) |
| Reproducer | `npm run probe:defects` (`scripts/probe-defects.mjs`) |
| Auth used | Public sandbox credentials documented by the vendor; tokens are never printed |
| Test data | Synthetic `QA_Defect_Probe` records, deleted after each probe run |

## Summary

| ID | Severity | Area | Summary |
| --- | --- | --- | --- |
| BUG-01 | Medium | Auth / status semantics | Missing credentials return `200 OK` instead of `400`/`401`. |
| BUG-02 | High | Create / validation | Missing, empty, or `null` required fields return `500` instead of `400`. |
| BUG-03 | High | Create / data integrity | Non-numeric `totalprice` is accepted and silently stored as `null`. |
| BUG-04 | Medium | Create / business rules | Negative `totalprice` is accepted and persisted. |
| BUG-05 | High | Create / data integrity | Invalid dates are accepted and stored as `"0NaN-aN-aN"`. |
| BUG-06 | Medium | Delete / error handling | Deleting an unknown id returns `405` instead of `404`. |
| BUG-07 | Medium | Delete / idempotency | Deleting the same booking twice returns `405` on the second call. |

Severity reflects impact on API consumers: **High** = corrupt or untrustworthy data, **Medium** = incorrect status/error semantics that break client logic, **Low** = cosmetic documentation mismatch.

### Observations that are documented quirks, not defects

These behaviors are unusual but are part of the published sandbox behavior, so the regression suite asserts them and does not raise them as bugs:

- `GET /ping` returns `201 Created` with body `Created`.
- Successful `DELETE` returns `201 Created` with body `Created`.
- Bad credentials return `200 OK` with a `reason` field. The status-code aspect is raised in BUG-01; the response shape itself is documented.

---

## BUG-01 — Missing credentials return `200 OK` instead of a client error

**Severity:** Medium  
**Component:** `POST /auth`  
**Status:** Open  
**Related test:** `POST /auth - invalid credentials (expect reason, no token)`

### Preconditions

- API is reachable at `https://restful-booker.herokuapp.com`.
- No valid token is required for this request.

### Steps to reproduce

1. Send `POST /auth` with `Content-Type: application/json` and body `{}`.
2. Observe the status code and body.
3. Repeat with a wrong password: `{"username":"admin","password":"wrong"}`.

### Expected result

- A missing or invalid credential payload should return `400 Bad Request` (missing fields) or `401 Unauthorized` (invalid credentials).
- No token should be issued.
- The response should be machine-readable, ideally JSON with a stable error code.

### Actual result

- Missing body: `200 OK`, `{"reason":"Bad credentials"}`.
- Wrong password: `200 OK`, `{"reason":"Bad credentials"}`.
- No token is issued, which is correct.

### Evidence

From [`docs/evidence/defect-probe.log`](evidence/defect-probe.log):

```text
[missing credentials body]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"reason":"Bad credentials"}
```

### Impact

Clients that branch on HTTP status treat a failed login as success. A missing request body is also a malformed request and should be rejected as `400`, not handled as a credential check. This weakens monitoring and can produce confusing retry loops.

### Suggested fix

Return `400` when `username` or `password` is absent or not a string, and `401` when the credentials do not match. Keep the `reason` field for backward compatibility if needed.

---

## BUG-02 — Missing or `null` required fields return `500 Internal Server Error`

**Severity:** High  
**Component:** `POST /booking`  
**Status:** Open  
**Related probes:** `empty object`, `missing firstname`, `null required fields`

### Preconditions

- API is reachable.
- No authentication is required for `POST /booking`.

### Steps to reproduce

1. Send `POST /booking` with `Content-Type: application/json` and body `{}`.
2. Observe `500 Internal Server Error`.
3. Send a body missing one required field, for example `{"lastname":"Automation","totalprice":100,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"}}`.
4. Send a body where required fields are explicitly `null`.

### Expected result

- `400 Bad Request`.
- A JSON validation error identifying the missing/invalid fields.
- No booking is created.

### Actual result

- `500 Internal Server Error` with `text/plain` body `Internal Server Error`.
- No booking is created.

### Evidence

```text
[empty object]
Status: 500
Content-Type: text/plain; charset=utf-8
Body: Internal Server Error

[missing firstname]
Status: 500
Content-Type: text/plain; charset=utf-8
Body: Internal Server Error

[null required fields]
Status: 500
Content-Type: text/plain; charset=utf-8
Body: Internal Server Error
```

### Impact

A client error is reported as a server failure. Consumers may retry indefinitely, alerting is polluted with false server incidents, and the API returns no actionable field-level feedback. This is a classic input-validation gap that can also mask deeper faults.

### Suggested fix

Validate the request body before persistence, return `400` with field-level errors, and add regression tests for empty, partial, and `null` payloads.

---

## BUG-03 — Non-numeric `totalprice` is accepted and stored as `null`

**Severity:** High  
**Component:** `POST /booking`  
**Status:** Open  
**Related probe:** `string totalprice`

### Steps to reproduce

1. Send `POST /booking` with a valid booking body but set `"totalprice":"not-a-number"`.
2. Observe `200 OK`.
3. Read the created booking.

### Expected result

- `400 Bad Request` because `totalprice` must be a number.
- No booking is created, or the invalid value is rejected explicitly.

### Actual result

- `200 OK`.
- The booking is created with `"totalprice": null`, silently discarding the invalid value.

### Evidence

```text
[string totalprice]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1159,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":null,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
Cleanup for created booking 1159: 201 Created
```

### Impact

The API accepts invalid data and changes its meaning instead of rejecting it. Downstream billing, reporting, or pricing logic that expects a number can receive `null` and fail or, worse, treat the booking as free. The client receives a success response, so it has no signal that its data was corrupted.

### Suggested fix

Enforce the documented numeric type for `totalprice`, return `400` on type mismatch, and never coerce invalid input to `null`.

---

## BUG-04 — Negative `totalprice` is accepted and persisted

**Severity:** Medium  
**Component:** `POST /booking`  
**Status:** Open  
**Related probe:** `negative totalprice`

### Steps to reproduce

1. Send `POST /booking` with a valid booking body but set `"totalprice":-100`.
2. Observe `200 OK`.
3. Read the created booking.

### Expected result

- `400 Bad Request` because a booking price cannot be negative.
- No booking is created.

### Actual result

- `200 OK`.
- The booking is stored with `"totalprice":-100`.

### Evidence

```text
[negative totalprice]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1167,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":-100,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
Cleanup for created booking 1167: 201 Created
```

### Impact

Negative prices can corrupt revenue calculations, invoices, and reconciliation. If the value is user-controlled, it may also become a business-logic abuse vector (for example, a credit instead of a charge).

### Suggested fix

Reject values below zero (or below the documented minimum) with `400` and a clear validation message.

---

## BUG-05 — Invalid dates are accepted and stored as `"0NaN-aN-aN"`

**Severity:** High  
**Component:** `POST /booking`  
**Status:** Open  
**Related probe:** `invalid date strings`

### Steps to reproduce

1. Send `POST /booking` with `"bookingdates":{"checkin":"not-a-date","checkout":"also-not-a-date"}`.
2. Observe `200 OK`.
3. Read the created booking.

### Expected result

- `400 Bad Request` because dates must be valid ISO `YYYY-MM-DD` values.
- No booking is created.

### Actual result

- `200 OK`.
- Dates are stored as `"0NaN-aN-aN"`.

### Evidence

```text
[invalid date strings]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1173,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":150,"depositpaid":true,"bookingdates":{"checkin":"0NaN-aN-aN","checkout":"0NaN-aN-aN"},"additionalneeds":"Breakfast"}}
Cleanup for created booking 1173: 201 Created
```

### Impact

Corrupt dates break availability calendars, sorting, and date-range queries. `"0NaN-aN-aN"` is not a valid date, yet the API reports success, so the client cannot detect the corruption without re-reading and validating the record.

### Suggested fix

Parse dates strictly, reject invalid or impossible dates with `400`, and verify `checkin < checkout`.

---

## BUG-06 — Deleting an unknown booking returns `405` instead of `404`

**Severity:** Medium  
**Component:** `DELETE /booking/:id`  
**Status:** Open  
**Related probe:** `unknown id with valid token`

### Preconditions

- A valid auth token was obtained from `POST /auth`.
- Booking id `999999999` does not exist.

### Steps to reproduce

1. Send `DELETE /booking/999999999` with `Cookie: token=<valid token>`.
2. Observe the status code and body.

### Expected result

- `404 Not Found` because the target resource does not exist.
- `text/plain` or JSON error body; either is acceptable if documented.

### Actual result

- `405 Method Not Allowed`, body `Method Not Allowed`.

### Evidence

```text
[unknown id with valid token]
Status: 405
Content-Type: text/plain; charset=utf-8
Body: Method Not Allowed
```

### Impact

`405` means the method is not allowed on that resource, which is false: `DELETE` is supported, the id simply does not exist. Clients may interpret `405` as a routing or permission problem and take the wrong recovery action.

### Suggested fix

Return `404` when the booking id is not found, and reserve `405` for genuinely unsupported methods.

---

## BUG-07 — Deleting the same booking twice returns `405`, so `DELETE` is not idempotent

**Severity:** Medium  
**Component:** `DELETE /booking/:id`  
**Status:** Open  
**Related probe:** `same id deleted again with valid token`

### Steps to reproduce

1. Create a booking and capture its id.
2. Send `DELETE /booking/:id` with a valid token; observe `201 Created`.
3. Send the same `DELETE` again; observe `405 Method Not Allowed`.
4. Send `GET /booking/:id`; observe `404 Not Found`.

### Expected result

- The second `DELETE` should return `404 Not Found` (or `204 No Content`) and remain safe to retry.
- `DELETE` should be idempotent: repeating it must not produce a method-level error.

### Actual result

- The second `DELETE` returns `405 Method Not Allowed`.
- The record is gone (`GET` returns `404`), so the state is correct but the response is misleading.

### Evidence

```text
[existing id with valid token]
Status: 201
Body: Created

[same id deleted again with valid token]
Status: 405
Body: Method Not Allowed

[GET after successful delete]
Status: 404
Body: Not Found
```

### Impact

Retries are unsafe to classify. A client that times out after a successful delete and retries receives `405`; it cannot tell whether the first attempt succeeded, the id never existed, or the method is prohibited. This complicates cleanup jobs and idempotent API design.

### Suggested fix

Return `404` on a delete of a missing record (consistent with BUG-06) or `204` for both the first and repeated delete. Document the chosen semantics.

---

## Reproduction notes

```bash
npm ci
npm run probe:defects
```

The probe:

- obtains a token but never prints it;
- creates a baseline booking and a set of deliberately invalid bookings;
- deletes every booking it creates;
- prints the HTTP transcript used as evidence.

The regression suite (`npm test`) is intentionally kept green. It asserts documented behavior and passing negative cases (malformed JSON, missing/invalid token, unknown `GET`, unauthenticated `DELETE`) rather than encoding these defects as expected results. The defects above are reproduced separately so a red CI run always means a regression, not a known vendor bug.
