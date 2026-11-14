# Test Plan — Restful Booker API

## 1. Purpose

Validate the Restful Booker live API against a stateful, chained workflow:

`POST /auth` → `POST /booking` → `PUT /booking/:id` → `GET /booking/:id` → negative/security checks → `DELETE /booking/:id` → `GET /booking/:id` (404).

The suite demonstrates dynamic variable chaining, contract and payload assertions, authorization negative testing, state-integrity verification, and safe test-data cleanup.

## 2. System under test

| Item | Detail |
| --- | --- |
| Target | `https://restful-booker.herokuapp.com` |
| API documentation | `https://restful-booker.herokuapp.com/apidoc/index.html` |
| Nature | Shared, stateful live sandbox |
| Authentication | `POST /auth` returns a token; protected writes use `Cookie: token=<token>` |
| Test artifact | `postman/RestfulBooker.postman_collection.json` |
| Runner | Postman GUI or official Postman CLI |
| Environment | `postman/RestfulBooker.postman_environment.json` |

## 3. Scope

### In scope

- Health check.
- Token generation and token use.
- Booking creation with dynamic, unique payload data.
- Extraction of `bookingid` from the create response.
- Booking update by extracted id with a valid token.
- Independent read-after-write verification of every updated field.
- Unauthorized update attempts (missing token and invalid token).
- Invalid credentials behavior.
- Unknown-resource behavior.
- State integrity after rejected writes.
- Deletion and deletion confirmation.
- Runtime cleanup of token and test data.
- JSON Schema and exact-payload assertions.
- CI execution, secret scanning, and dependency auditing.

### Out of scope

- UI testing.
- Load, stress, soak, or performance testing.
- Penetration testing or exploitation.
- Destructive testing of other users' records.
- List/filter endpoints (`GET /booking` with query parameters).
- Testing the API documentation site itself.
- Testing non-REST integrations or third-party dependencies.

## 4. Risk assessment

| Risk | Impact | Likelihood | Mitigation in this suite |
| --- | --- | --- | --- |
| Unauthorized write is accepted | Critical | Medium | Two negative `PUT` tests plus a read-after-rejection state-integrity check. |
| Dynamic chaining passes the wrong id/token | High | Medium | Extract values from responses; assert id is a positive integer; use the extracted id in every downstream URL. |
| Update appears successful but is not persisted | High | Medium | Independent `GET` after `PUT` with exact deep equality. |
| Test data pollutes the shared sandbox | High | Medium | Unique run suffix, future dates, `DELETE`, and `404` confirmation. Note: cleanup is best-effort if the API is unavailable. |
| Token or credentials leak through logs/artifacts | High | Medium | Ephemeral token, no console logging, HTTPS guard, raw report redaction, only sanitized summary uploaded. |
| Contract drift breaks consumers silently | Medium | Medium | JSON Schema assertions for auth, booking, create, and bad-credentials responses. |
| Additive API changes cause false failures | Medium | Medium | Schemas require critical fields/types but allow additional properties. |
| Shared live API is noisy or slow | Medium | High | Unique data, generous 30-second liveness guard, CI schedule to surface drift. |
| Heroku cold start causes a flaky failure | Medium | Medium | 30-second request timeout and a 30-second liveness assertion; no tight performance SLO. |
| Stale state from a failed prior run is reused | High | Low | Auth clears the old token; create clears the old `bookingId` before creating a new record. |

## 5. Test strategy

### 5.1 Happy path

1. Authenticate and capture the token.
2. Create a booking with a unique `QA_<suffix>` payload.
3. Capture `bookingid`.
4. Update the booking with a distinct payload and the captured token.
5. Read the booking independently and compare every field.

### 5.2 Contract testing

Each JSON response is checked against a JSON Schema that validates:

- required fields
- primitive types
- positive booking id
- non-empty strings
- ISO date shape (`YYYY-MM-DD`)
- expected bad-credentials reason

Schemas intentionally allow additive properties to avoid brittle failures when the sandbox adds fields.

### 5.3 Negative and security testing

| ID | Attempt | Expected result |
| --- | --- | --- |
| NEG-01 | `PUT /booking/:id` with no token | `403 Forbidden`; sentinel payload not persisted |
| NEG-02 | `PUT /booking/:id` with an invalid token | `403 Forbidden`; sentinel payload not persisted |
| NEG-03 | `POST /auth` with a wrong password | `200` + `reason: Bad credentials`; no `token` property |
| NEG-04 | `GET /booking/999999999` | `404 Not Found` |
| NEG-05 | `GET /booking/:id` after NEG-01/NEG-02 | still equals the last authorized update; sentinel absent |

The negative payload uses a distinct marker (`QA_SHOULD_NOT_PERSIST_<suffix>`, price `999`, additional need `Unauthorized change`). This makes an authorization bypass detectable even if the API returns a success-looking response.

### 5.4 Cleanup

- `DELETE /booking/:id` must return `201 Created`.
- A follow-up `GET` must return `404 Not Found`.
- Runtime variables (`token`, `bookingId`, payload expectations) are unset.
- The suite is safe to re-run; a new unique booking is created each time.

### 5.5 Test data

- Unique suffix from timestamp + random component.
- Dates generated relative to the current UTC date.
- No PII.
- No reuse of another user's booking id.
- Environment credentials are the publicly documented sandbox credentials only.

## 6. Test scenarios and traceability

| ID | Scenario | Request(s) | Key assertions | Assessment requirement |
| --- | --- | --- | --- | --- |
| TC-01 | Service health | `GET /ping` | `201`, text body, content type | Environment readiness |
| TC-02 | Generate auth token | `POST /auth` | `200`, schema, non-empty token, token stored | Auth |
| TC-03 | Create booking and extract id | `POST /booking` | `200`, schema, positive integer id, exact payload, id stored | Create + dynamic extraction |
| TC-04 | Update booking | `PUT /booking/:id` | `200`, schema, exact update payload, changed from original | Update with extracted id + token |
| TC-05 | Verify update | `GET /booking/:id` | `200`, schema, exact updated payload, original values gone | Verify |
| TC-06 | Update without token | `PUT /booking/:id` | `403`, `Forbidden` | Negative testing |
| TC-07 | Update with invalid token | `PUT /booking/:id` | `403`, `Forbidden` | Negative/security testing |
| TC-08 | Invalid credentials | `POST /auth` | `200`, `reason: Bad credentials`, no token | Negative auth |
| TC-09 | Unknown booking | `GET /booking/999999999` | `404`, `Not Found` | Error handling |
| TC-10 | Rejected writes do not mutate data | `GET /booking/:id` | exact authorized state retained; sentinel absent | State integrity |
| TC-11 | Delete booking | `DELETE /booking/:id` | `201`, body `Created` | Cleanup |
| TC-12 | Confirm deletion and clear runtime state | `GET /booking/:id` | `404`, variables unset | Cleanup + security |

## 7. Assertion coverage

| Layer | Examples |
| --- | --- |
| Status code | `200`, `201`, `403`, `404` |
| Headers | `Content-Type: application/json` or `text/plain` |
| JSON Schema | Auth token, booking, create-booking, bad-credentials |
| Exact payload | Deep equality between sent and returned booking |
| Specific data points | firstname, lastname, totalprice, depositpaid, checkin, checkout, additionalneeds |
| State transition | updated values differ from original |
| Independent read | fresh `GET` returns the updated record |
| Authorization | rejected writes return `403` |
| Data integrity | sentinel values never persist |
| Cleanup | deleted record returns `404` |
| Runtime hygiene | token and booking variables unset |
| Liveness | each response under a generous 30-second guard |

Current suite size: **12 requests, 65 assertions** (12 collection-level liveness checks plus 53 request-level checks).

## 8. Security controls

1. No production secrets are committed.
2. Only publicly documented sandbox credentials are present.
3. The token is stored in an ephemeral collection variable, never logged, and unset at the end.
4. A collection-level pre-request rejects non-local HTTP URLs to prevent plaintext credential transmission.
5. Auth and create clear stale state before use.
6. Raw Postman CLI execution reports (which contain headers and bodies) are deleted; only summary YAML is uploaded.
7. CI uses least-privilege permissions and no repository secrets.
8. `npm audit` must pass and a local secret scan runs before tests.
9. Dependencies are locked and monitored by Dependabot.
10. Test data is synthetic, uniquely tagged, and removed.

## 9. Entry criteria

- Target API is reachable over HTTPS.
- Public sandbox credentials are valid.
- Node.js 18+ and npm are available.
- Environment file is imported/selected.
- Collection is run in order.

## 10. Exit criteria

- All 12 requests execute.
- All assertions pass.
- The booking is deleted and a follow-up `GET` returns `404`.
- No token, password, or raw request/response report is committed or uploaded.
- Secret scan and dependency audit pass.

A run is **failed** if any assertion fails, the cleanup `DELETE` fails, the post-delete `GET` is not `404`, or a sensitive value is found in tracked files or uploaded artifacts.

## 11. Execution

### Local

```bash
npm ci
npm run verify
```

`verify` runs the secret scan and the full collection. To run only the health check:

```bash
npm run test:smoke
```

### CI

GitHub Actions runs on push, pull request, manual dispatch, and a weekly schedule. The job:

1. Installs from `package-lock.json`.
2. Runs the secret scan.
3. Runs `npm audit --audit-level=high`.
4. Executes the Postman collection.
5. Redacts raw execution reports.
6. Uploads only `reports/*.collection-run-summary.yaml`.

## 12. Reporting

- Console output shows each request, status, and assertion.
- The sanitized summary YAML contains run counts, timings, and failure messages.
- Raw execution YAML is deleted because it can contain auth headers, request bodies, and response bodies.
- CI retains the sanitized summary for 14 days.

## 13. Known API behaviors and maintenance notes

| Behavior | Observed response | Why it matters |
| --- | --- | --- |
| Health check | `201 Created`, `text/plain` body `Created` | Do not assume a conventional `200` health response. |
| Invalid credentials | `200 OK` with `{"reason":"Bad credentials"}` | The test documents the quirk and asserts no token is issued. |
| Unauthorized update | `403 Forbidden`, `text/plain` | Negative assertions must not assume JSON. |
| Delete | `201 Created`, body `Created` | Do not assert `204 No Content`. |
| Delete again | `405 Method Not Allowed` | The suite avoids double-delete assertions; it verifies deletion with `GET`. |

If the API changes status codes, response shapes, or auth behavior, update the collection assertions and this test plan together. Keep the schemas forward-compatible unless a breaking contract change is intentional.

## 14. Limitations

- Shared live data and Heroku availability are outside the suite's control.
- Cleanup is best-effort; a failed `DELETE` can leave a uniquely tagged record.
- The liveness guard is not a performance benchmark.
- The suite does not test concurrency, rate limits, or security exploitation.
- The suite does not retry failed requests; failures are surfaced for investigation.
