# QA Assessment — Test Strategy, Test Cases, and Defect Report

**Prepared by:** QA Assessment Candidate  
**Date:** 15 November 2026  
**Version:** 1.0  
**Repository:** https://github.com/Chelbeez/restful-booker-api-tests

> **Submission note:** The Restful Booker API suite was executed and passed. The AcademyBugs web application was **not executed** for this submission, per instruction. Its test cases are documented and ready to run; no web screenshots are claimed. API execution logs and CI evidence are included.

## Contents

1. Executive summary
2. Test strategy
3. Web application test cases — AcademyBugs
4. API test cases — Restful Booker (executed)
5. Bug reports — Restful Booker API
6. Execution evidence
7. Traceability matrix
8. Limitations and assumptions
9. Glossary
10. Sign-off

---

## 1. Executive summary

This document covers two targets:

| Target | Type | Status in this submission |
| --- | --- | --- |
| `https://restful-booker.herokuapp.com` | REST API | **Executed.** 15 requests, 77 assertions, 0 failures. Seven reproducible defects documented. |
| `https://academybugs.com/` | Web application | **Designed but not executed**, per instruction. Fourteen test cases are ready to run. |

### 1.1 API result

The API suite proves a complete chained workflow:

`POST /auth` → `POST /booking` → `PUT /booking/:id` → `GET /booking/:id` → `DELETE /booking/:id`

It demonstrates:

- dynamic extraction of a token and booking id from responses;
- status-code, content-type, JSON Schema, and field-by-field payload assertions;
- authorization negative tests with a read-after-rejection state check;
- malformed-JSON negative tests;
- cleanup verification with a final `404`;
- sanitized reporting and CI execution.

### 1.2 Defects found

Seven defects were reproduced with HTTP transcripts:

1. Missing credentials return `200 OK` instead of `400`/`401`.
2. Missing or `null` required booking fields return `500` instead of `400`.
3. Non-numeric `totalprice` is accepted and stored as `null`.
4. Negative `totalprice` is accepted.
5. Invalid dates are accepted and stored as `"0NaN-aN-aN"`.
6. Deleting an unknown booking returns `405` instead of `404`.
7. Deleting the same booking twice returns `405`, so `DELETE` is not idempotent.

### 1.3 Deliverables

| Deliverable | Location |
| --- | --- |
| Postman collection | `postman/RestfulBooker.postman_collection.json` |
| Postman environment | `postman/RestfulBooker.postman_environment.json` |
| Test plan | `docs/TEST_PLAN.md` |
| Per-endpoint API report | `docs/API_TEST_REPORT.md` |
| Formal bug reports | `docs/BUG_REPORTS.md` |
| Sanitized HTTP evidence log | `docs/evidence/defect-probe.log` |
| Defect reproducer | `scripts/probe-defects.mjs` |
| CI workflow | `.github/workflows/api-tests.yml` |
| This document | `docs/QA_ASSESSMENT_TEST_DOCUMENT.md` and `.docx` |

---

## 2. Test strategy

### 2.1 Objectives

1. Prove that the required API workflow works end to end with real chained data.
2. Verify both the response contract and the persisted server state.
3. Test negative and security-relevant behavior, not only happy paths.
4. Record reproducible evidence for every defect.
5. Keep the regression suite deterministic and green while documenting vendor defects separately.
6. Provide a reusable web test design for the AcademyBugs practice site.

### 2.2 Scope

#### In scope

| Area | Included |
| --- | --- |
| API functional testing | Auth, create, update, read, delete, health check |
| API integration/chaining | Token and booking id extracted and reused |
| API contract testing | JSON Schema, content type, status code |
| API negative testing | Missing/invalid token, malformed JSON, unknown resource, invalid input |
| API state integrity | Read-after-write and read-after-rejection |
| API security hygiene | Ephemeral token, HTTPS guard, redacted reports, secret scan |
| Web functional testing | Navigation, search, sorting, product details, cart, checkout, login |
| Web non-functional smoke | Responsive layout, console errors, broken links/images |
| Reporting | Test strategy, test cases, execution evidence, bug reports |

#### Out of scope

- Load, stress, soak, or performance benchmarking.
- Penetration testing or exploitation.
- Payment processing with real money or real card data.
- Destructive testing of other users' records.
- Fixing the vendor applications.
- Executing the AcademyBugs web cases in this submission, per instruction.
- Testing third-party integrations outside the two target applications.

### 2.3 Test approach

#### API approach

The API is tested as a **stateful journey**, not as isolated requests:

1. Authenticate and capture the token.
2. Create a uniquely tagged booking and capture its id.
3. Update the booking with a different payload.
4. Read it back independently and compare every submitted field.
5. Attempt unauthorized writes and deletes with a sentinel payload.
6. Read again to prove the rejected operations did not mutate state.
7. Delete the booking and confirm `404`.
8. Clear runtime variables so the next run starts clean.

Assertions are layered so a failure identifies the type of problem:

| Layer | Question answered |
| --- | --- |
| Transport/status | Did the request succeed or fail as expected? |
| Content type | Is the response in the documented format? |
| Schema | Does the response have the required fields and types? |
| Payload equality | Did every submitted field come back correctly? |
| Business data | Are the specific name, price, dates, and flags correct? |
| State transition | Did the update actually change the record? |
| Independent read | Did the change persist after a fresh request? |
| Authorization | Was the protected operation rejected? |
| Data integrity | Did the rejected operation leave the data untouched? |
| Cleanup | Is the test record gone? |

#### Web approach

The web cases follow a risk-based functional design:

- **Happy path first:** page load, navigation, search, product details, cart, checkout, login.
- **Negative and validation cases:** empty required fields, invalid credentials, invalid quantities, missing search term.
- **State checks:** cart totals and item counts after add, update, and remove.
- **Cross-cutting smoke checks:** responsive layout, console errors, broken links, missing images.
- Each case has explicit preconditions, steps, expected results, priority, and the evidence to capture when executed.

Because the site was not run for this submission, the web cases are marked **Designed — not executed**. No web pass/fail result or screenshot is claimed.

### 2.4 Environments

| Item | API | Web |
| --- | --- | --- |
| Target | `https://restful-booker.herokuapp.com` | `https://academybugs.com/` |
| Documentation | `https://restful-booker.herokuapp.com/apidoc/index.html` | Public practice site |
| Test artifact | Postman v2.1 collection + environment | Documented manual test cases |
| Runner | Official Postman CLI (`npm test`) or Postman GUI | Chromium browser |
| Authentication | `POST /auth` token in `Cookie: token=<token>` | Site login/registration |
| Test data | Synthetic `QA_<suffix>` booking | Synthetic customer and address data |
| Execution status | Executed | Not executed, per instruction |

### 2.5 Test types

| Test type | API | Web |
| --- | --- | --- |
| Functional | Yes | Yes, designed |
| Integration/chaining | Yes | Yes, designed |
| Contract/schema | Yes | Not applicable |
| Negative/validation | Yes | Yes, designed |
| Authorization | Yes | Yes, designed |
| State/data integrity | Yes | Yes, designed |
| Regression | Yes | Yes, designed |
| Usability/accessibility smoke | No | Yes, designed |
| Performance | No | No |
| Security penetration | No | No |

### 2.6 Entry and exit criteria

#### Entry criteria

- Target is reachable over HTTPS.
- Public sandbox credentials are valid.
- Node.js 20+ and npm are installed.
- Postman collection and environment are available.
- Collection is run in order.
- Web environment has a supported browser and test data.

#### Exit criteria

- All API requests execute.
- All API assertions pass.
- The created booking is deleted and a follow-up `GET` returns `404`.
- No token, password, or raw request/response report is committed or uploaded.
- Secret scan and dependency audit pass.
- Web cases are documented with clear expected results and evidence instructions.

### 2.7 Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Unauthorized write is accepted | Critical | Medium | Missing/invalid token tests plus read-after-rejection check. |
| Dynamic chaining uses the wrong id or token | High | Medium | Extract values from responses; assert id is a positive integer. |
| Update appears successful but is not persisted | High | Medium | Independent `GET` with field-by-field comparison. |
| Invalid input creates corrupt data | High | High | Negative probes for missing fields, wrong types, negative prices, and invalid dates. |
| Test data pollutes the shared sandbox | High | Medium | Unique run suffix, future dates, `DELETE`, and `404` confirmation. |
| Token or credentials leak through logs/artifacts | High | Medium | Ephemeral token, HTTPS guard, raw-report redaction, sanitized summary only. |
| Shared live API is noisy or slow | Medium | High | Unique data and a generous 30-second liveness guard. |
| Heroku cold start causes a flaky failure | Medium | Medium | 30-second request timeout; no tight performance SLO. |
| Stale state from a failed prior run is reused | High | Low | Auth and create clear stale variables before use. |
| Web test execution is inconsistent | Medium | Medium | Explicit preconditions, steps, test data, and evidence checklist. |

### 2.8 Tools and artifacts

| Tool | Purpose |
| --- | --- |
| Postman v2.1 collection | Portable API test definition; runs in GUI or CLI. |
| Official Postman CLI | Headless execution and summary report. |
| Node.js scripts | Defect probe, secret scan, report redaction. |
| GitHub Actions | CI execution, audit, artifact upload. |
| Chromium browser | Web test execution (when the web cases are run). |
| Git/GitHub | Version control and public evidence. |

### 2.9 Test data and cleanup

- API bookings use a unique `QA_<timestamp>_<random>` prefix.
- Dates are generated relative to the current UTC date.
- No personally identifiable information is used.
- The API suite deletes its booking and confirms `404`.
- The defect probe creates its own bookings and deletes every one it creates.
- Web test data should use a dedicated synthetic account and a test address; no real payment data.

---

## 3. Web application test cases — AcademyBugs

> **Execution status:** Not executed, per instruction. The cases below are complete designs and are ready to run. When executed, attach a screenshot of the relevant page and, where useful, a browser console/network log.

### 3.1 Web test case summary

| ID | Test case | Priority | Status |
| --- | --- | --- | --- |
| WEB-01 | Homepage loads and primary navigation works | High | Designed — not executed |
| WEB-02 | Product listing displays products, names, and prices | High | Designed — not executed |
| WEB-03 | Search returns relevant products | High | Designed — not executed |
| WEB-04 | Price low-to-high sorting is correct | High | Designed — not executed |
| WEB-05 | Product detail page shows correct content | High | Designed — not executed |
| WEB-06 | Add a product to the cart | Critical | Designed — not executed |
| WEB-07 | Update cart quantity and verify totals | Critical | Designed — not executed |
| WEB-08 | Remove an item from the cart | High | Designed — not executed |
| WEB-09 | Checkout rejects empty required fields | Critical | Designed — not executed |
| WEB-10 | Checkout accepts valid synthetic data | Critical | Designed — not executed |
| WEB-11 | Login rejects invalid credentials | High | Designed — not executed |
| WEB-12 | Responsive layout works at mobile width | Medium | Designed — not executed |
| WEB-13 | No broken links or missing images | Medium | Designed — not executed |
| WEB-14 | No unexpected console errors on key pages | Medium | Designed — not executed |

### 3.2 Web test case details

#### WEB-01 — Homepage loads and primary navigation works

- **Priority:** High
- **Preconditions:** Browser can reach `https://academybugs.com/`.
- **Steps:**
  1. Open the homepage.
  2. Confirm the page title and main heading are visible.
  3. Click each primary navigation item: Examples of Bugs, Types of Bugs, Find Bugs, Report Bugs.
  4. Return to the homepage.
- **Expected result:** Every page loads without a server error, the correct page heading is shown, and navigation returns to a valid page.
- **Evidence to capture:** Homepage screenshot and one screenshot per destination page.
- **Status:** Designed — not executed.

#### WEB-02 — Product listing displays products, names, and prices

- **Priority:** High
- **Preconditions:** Open the Find Bugs product listing.
- **Steps:**
  1. Open the product listing.
  2. Count the displayed products.
  3. Check that each product shows a name, an image, and a price or a valid "Login for Pricing" label.
  4. Confirm the result count matches the number of displayed products.
- **Expected result:** All products render with a name, image, and price/status; the result count is consistent with the grid.
- **Evidence to capture:** Full-page listing screenshot.
- **Status:** Designed — not executed.

#### WEB-03 — Search returns relevant products

- **Priority:** High
- **Preconditions:** Open the product listing.
- **Steps:**
  1. Enter `shirt` in the product search field.
  2. Submit the search.
  3. Review every result title and image.
  4. Repeat with a nonsense term such as `zzzz-no-product`.
- **Expected result:** `shirt` returns only shirt-related products; the nonsense term returns a clear "no results" message rather than an error page.
- **Evidence to capture:** Screenshot of results and screenshot of the no-results state.
- **Status:** Designed — not executed.

#### WEB-04 — Price low-to-high sorting is correct

- **Priority:** High
- **Preconditions:** Open the product listing with all products visible.
- **Steps:**
  1. Select "Price Low-High".
  2. Record the displayed price of each product in order.
  3. Compare the sequence with a sorted list of the same prices.
  4. Repeat for "Price High-Low".
- **Expected result:** Products are ordered by the effective displayed price, ascending for Low-High and descending for High-Low.
- **Evidence to capture:** Screenshot of the sorted grid and a short note listing the observed price order.
- **Status:** Designed — not executed.

#### WEB-05 — Product detail page shows correct content

- **Priority:** High
- **Preconditions:** Open the product listing.
- **Steps:**
  1. Select a product with a visible price.
  2. Confirm the detail page shows the same product name and price as the listing.
  3. Confirm the description, image, and add-to-cart control are present.
  4. Use the browser back button to return to the listing.
- **Expected result:** Detail content matches the selected product; navigation back preserves the listing.
- **Evidence to capture:** Listing screenshot and detail-page screenshot.
- **Status:** Designed — not executed.

#### WEB-06 — Add a product to the cart

- **Priority:** Critical
- **Preconditions:** Product listing is open; cart is empty.
- **Steps:**
  1. Add one product to the cart.
  2. Open the cart.
  3. Verify the product name, unit price, quantity, and cart count.
- **Expected result:** The correct product appears once, the quantity is 1, the cart count increases by 1, and the line total equals the unit price.
- **Evidence to capture:** Screenshot of the cart and the confirmation message.
- **Status:** Designed — not executed.

#### WEB-07 — Update cart quantity and verify totals

- **Priority:** Critical
- **Preconditions:** Cart contains one product.
- **Steps:**
  1. Change the quantity from 1 to 3.
  2. Apply the update.
  3. Verify the line total and cart subtotal.
  4. Try quantity `0` and a negative value.
- **Expected result:** Quantity 3 recalculates the line total and subtotal correctly. Zero or negative quantities are rejected or remove the item with a clear message.
- **Evidence to capture:** Screenshot before and after the update, plus the validation message for invalid quantities.
- **Status:** Designed — not executed.

#### WEB-08 — Remove an item from the cart

- **Priority:** High
- **Preconditions:** Cart contains at least one product.
- **Steps:**
  1. Click the remove/delete control for the product.
  2. Confirm the removal if prompted.
  3. Verify the cart contents and count.
- **Expected result:** The item is removed, the count and subtotal are recalculated, and an empty-cart message appears when the last item is removed.
- **Evidence to capture:** Screenshot of the updated cart.
- **Status:** Designed — not executed.

#### WEB-09 — Checkout rejects empty required fields

- **Priority:** Critical
- **Preconditions:** Cart contains one product; checkout page is open.
- **Steps:**
  1. Leave all required fields empty.
  2. Submit the checkout form.
  3. Repeat with only one required field missing.
- **Expected result:** Submission is blocked, required fields are clearly identified, and no order is created.
- **Evidence to capture:** Screenshot of the validation errors and the network request (if any).
- **Status:** Designed — not executed.

#### WEB-10 — Checkout accepts valid synthetic data

- **Priority:** Critical
- **Preconditions:** Cart contains one product; a synthetic customer and address are available; payment is a test method or cash-on-delivery.
- **Steps:**
  1. Complete every required field with valid synthetic data.
  2. Submit the order.
  3. Verify the confirmation page and order summary.
  4. Do not use real payment details.
- **Expected result:** The order is accepted, the confirmation shows the correct items and total, and the cart is cleared.
- **Evidence to capture:** Screenshot of the confirmation page and order number (mask any personal data).
- **Status:** Designed — not executed.

#### WEB-11 — Login rejects invalid credentials

- **Priority:** High
- **Preconditions:** Login page is open.
- **Steps:**
  1. Enter a valid-format email with a wrong password.
  2. Submit.
  3. Repeat with an empty email and password.
- **Expected result:** Login fails with a clear, non-revealing error; no session is created; the user remains on the login page.
- **Evidence to capture:** Screenshot of the error state.
- **Status:** Designed — not executed.

#### WEB-12 — Responsive layout works at mobile width

- **Priority:** Medium
- **Preconditions:** Browser developer tools are available.
- **Steps:**
  1. Set the viewport to 375 × 812 (mobile).
  2. Open the homepage, listing, product detail, and cart.
  3. Check for horizontal scrolling, overlapping text, and unreachable controls.
- **Expected result:** Content reflows without horizontal scroll; navigation and primary actions remain usable.
- **Evidence to capture:** Mobile-width screenshots of each page.
- **Status:** Designed — not executed.

#### WEB-13 — No broken links or missing images

- **Priority:** Medium
- **Preconditions:** Homepage, listing, detail, cart, and checkout pages are reachable.
- **Steps:**
  1. Check each primary navigation link and footer link.
  2. Confirm every product image loads.
  3. Record any `404`, broken image icon, or redirect loop.
- **Expected result:** Links resolve to valid pages and images render correctly.
- **Evidence to capture:** Screenshot or list of any broken link/image URL.
- **Status:** Designed — not executed.

#### WEB-14 — No unexpected console errors on key pages

- **Priority:** Medium
- **Preconditions:** Browser developer tools Console tab is open.
- **Steps:**
  1. Load the homepage, listing, detail, cart, and checkout.
  2. Clear the console between pages.
  3. Record errors and failed network requests.
- **Expected result:** No uncaught JavaScript errors or failed critical requests on the happy path.
- **Evidence to capture:** Console/network log export and a screenshot of any error.
- **Status:** Designed — not executed.

---

## 4. API test cases — Restful Booker (executed)

### 4.1 Flow overview

| ID | Request | Chained state | Main assertions | Result |
| --- | --- | --- | --- | --- |
| API-01 | `GET /ping` | — | `201`, `text/plain`, body `Created` | Pass |
| API-02 | `POST /auth` | stores `token` | `200`, JSON, schema, non-empty token | Pass |
| API-03 | `POST /booking` | stores `bookingId` | `200`, schema, positive id, fields echoed | Pass |
| API-04 | `PUT /booking/:id` | uses token + id | `200`, schema, fields echoed, state changed | Pass |
| API-05 | `GET /booking/:id` | uses id | `200`, schema, updated fields persisted | Pass |
| API-06 | `PUT /booking/:id` without token | uses id | `403`, `Forbidden`, no mutation | Pass |
| API-07 | `PUT /booking/:id` with invalid token | uses id | `403`, `Forbidden`, no mutation | Pass |
| API-08 | `POST /auth` with bad password | — | `200` + `reason`, no token | Pass |
| API-09 | `POST /auth` with malformed JSON | — | `400`, `Bad Request` | Pass |
| API-10 | `POST /booking` with malformed JSON | — | `400`, `Bad Request` | Pass |
| API-11 | `GET /booking/999999999` | — | `404`, `Not Found` | Pass |
| API-12 | `DELETE /booking/:id` without token | uses id | `403`, record survives | Pass |
| API-13 | `GET /booking/:id` after rejected writes/deletes | uses id | last authorized state retained | Pass |
| API-14 | `DELETE /booking/:id` | uses token + id | `201`, body `Created` | Pass |
| API-15 | `GET /booking/:id` after delete | uses id | `404`, variables cleared | Pass |

### 4.2 `GET /ping` — service health

#### Request details

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `{{baseUrl}}/ping` |
| Headers | `Accept: application/json` |
| Body | None |
| Purpose | Confirm the service is reachable before the stateful flow. |

#### Response details

| Field | Value |
| --- | --- |
| Status | `201 Created` |
| Content-Type | `text/plain; charset=utf-8` |
| Body | `Created` |

#### Assertions

- Status is `201`.
- Content-Type is `text/plain`.
- Body is `Created`.
- Response completes within the 30-second liveness guard.

#### Short analysis

The health check is unconventional: it returns `201 Created` rather than `200 OK`. The suite asserts the observed documented behavior so the check is meaningful, and the difference is documented as a quirk rather than a defect. The endpoint is not part of the required CRUD flow but is a useful readiness gate.

#### Negative scenario

No dedicated negative case is required for a health check. The liveness assertion fails if the service is unavailable or returns an unexpected status.

### 4.3 `POST /auth` — generate an authentication token

#### Request details

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `{{baseUrl}}/auth` |
| Headers | `Content-Type: application/json`, `Accept: application/json` |
| Body | `{"username":"admin","password":"password123"}` |
| Pre-request | Clears stale `token`, `bookingId`, and payload variables. |
| Purpose | Obtain the token required by `PUT` and `DELETE`. |

#### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | `{"token":"<ephemeral token>"}` |
| Chained state | `token` is stored in a collection variable and sent as `Cookie: token=<token>`. |

#### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the auth-token JSON Schema (required, non-empty `token`).
- Token is present and non-empty.
- Token is stored in an ephemeral collection variable.

#### Short analysis

The happy path works, and the token is successfully used by the downstream `PUT` and `DELETE`. Error handling is weak: missing credentials return `200 OK` with `{"reason":"Bad credentials"}`, which is indistinguishable from success to a client that checks only the status code. The suite asserts the observed behavior as a documented quirk and records the status-semantics issue as BUG-01.

#### Negative scenarios

| ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| NEG-AUTH-01 | Wrong password | `401 Unauthorized` (or documented `200` + reason), no token | `200 OK` + `{"reason":"Bad credentials"}`, no token | Asserted; BUG-01 |
| NEG-AUTH-02 | Missing username/password (`{}`) | `400 Bad Request` | `200 OK` + reason | Documented; BUG-01 |
| NEG-AUTH-03 | Malformed JSON | `400 Bad Request`, `text/plain` | `400 Bad Request`, `Bad Request` | Pass |

### 4.4 `POST /booking` — create a booking

#### Request details

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `{{baseUrl}}/booking` |
| Headers | `Content-Type: application/json`, `Accept: application/json` |
| Body | Unique `QA_<run-suffix>` booking with name, price, deposit flag, dates, and additional needs. |
| Pre-request | Clears stale `bookingId`; builds a run-unique payload and stores expected values. |
| Purpose | Create test data and extract the generated `bookingid`. |

#### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | `{"bookingid":<positive integer>,"booking":{...}}` |
| Chained state | `bookingId` and payload expectations are stored for later requests. |

#### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the create-booking JSON Schema.
- `bookingid` is a positive integer.
- Every submitted field is echoed with the correct value (additive fields tolerated).
- The payload is run-specific.
- `bookingId` is persisted for downstream requests.

#### Short analysis

Creation and dynamic extraction work correctly for valid data. Input validation is the weakest area: missing or `null` required fields return `500`, non-numeric and negative prices are accepted, and invalid dates are normalized to `"0NaN-aN-aN"`. These are the highest-impact defects in the assessment because they allow corrupt data to be stored successfully.

#### Negative scenarios

| ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| NEG-CREATE-01 | Malformed JSON | `400 Bad Request` | `400 Bad Request` | Pass |
| NEG-CREATE-02 | Empty object `{}` | `400` with field errors | `500 Internal Server Error` | BUG-02 |
| NEG-CREATE-03 | Missing `firstname` | `400` | `500 Internal Server Error` | BUG-02 |
| NEG-CREATE-04 | String `totalprice` | `400` | `200`; stored as `null` | BUG-03 |
| NEG-CREATE-05 | Negative `totalprice` | `400` | `200`; negative value stored | BUG-04 |
| NEG-CREATE-06 | Invalid date strings | `400` | `200`; `"0NaN-aN-aN"` stored | BUG-05 |
| NEG-CREATE-07 | All required fields `null` | `400` | `500 Internal Server Error` | BUG-02 |

### 4.5 `PUT /booking/:id` — replace a booking

#### Request details

| Field | Value |
| --- | --- |
| Method | `PUT` |
| URL | `{{baseUrl}}/booking/{{bookingId}}` |
| Headers | `Content-Type: application/json`, `Accept: application/json`, `Cookie: token={{token}}` |
| Body | A second unique payload with changed name, price, deposit flag, dates, and additional needs. |
| Pre-request | Fails fast if `bookingId` or `token` is missing. |
| Purpose | Prove authenticated replacement using the extracted token and id. |

#### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | The updated booking object. |
| Chained state | Expected update values are retained for the following `GET`. |

#### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the booking JSON Schema.
- Every submitted update field is echoed correctly (additive fields tolerated).
- Specific business fields are correct.
- The update differs from the original create payload.

#### Short analysis

The authorized update works and changes persisted state; the independent `GET` confirms it. Authorization is enforced: missing and invalid tokens both return `403`, and a read-after-rejection check proves the sentinel payload did not persist. Input validation is inconsistent with create: empty and partial payloads correctly return `400` and leave the record unchanged.

#### Negative scenarios

| ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| NEG-PUT-01 | No auth cookie | `403`, no mutation | `403`, `Forbidden`, no mutation | Pass |
| NEG-PUT-02 | Invalid token | `403`, no mutation | `403`, `Forbidden`, no mutation | Pass |
| NEG-PUT-03 | Empty object with valid token | `400`, state unchanged | `400`, state unchanged | Pass |
| NEG-PUT-04 | Partial payload with valid token | `400`, state unchanged | `400`, state unchanged | Pass |

### 4.6 `GET /booking/:id` — verify persisted state

#### Request details

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `{{baseUrl}}/booking/{{bookingId}}` |
| Headers | `Accept: application/json` |
| Body | None |
| Pre-request | Fails fast if `bookingId` is missing. |
| Purpose | Independently read the record after `PUT` and prove persistence. |

#### Response details

| Field | Value |
| --- | --- |
| Status | `200 OK` |
| Content-Type | `application/json; charset=utf-8` |
| Body | The persisted booking object. |

#### Assertions

- Status is `200`.
- Content-Type is JSON.
- Body matches the booking JSON Schema.
- Every updated field matches the value submitted in `PUT`.
- Updated values survive a fresh `GET`.
- Original create values are no longer present.

#### Short analysis

This is the independent verification step. It does not trust the `PUT` response; it re-reads the resource and compares it with the payload the test sent. The check passes, so the update is genuinely persisted. The same technique proves rejected writes and deletes had no side effects.

#### Negative scenarios

| ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| NEG-GET-01 | Unknown id `999999999` | `404`, `text/plain` | `404`, `Not Found` | Pass |
| NEG-GET-02 | Read after rejected `PUT`/`DELETE` | Last authorized state intact | State intact; sentinel absent | Pass |

### 4.7 `DELETE /booking/:id` — remove test data

#### Request details

| Field | Value |
| --- | --- |
| Method | `DELETE` |
| URL | `{{baseUrl}}/booking/{{bookingId}}` |
| Headers | `Accept: application/json`, `Cookie: token={{token}}` |
| Body | None |
| Pre-request | Fails fast if `bookingId` or `token` is missing. |
| Purpose | Clean up the created booking and confirm removal. |

#### Response details

| Field | Value |
| --- | --- |
| Status | `201 Created` |
| Content-Type | `text/plain; charset=utf-8` |
| Body | `Created` |
| Follow-up | `GET /booking/:id` returns `404 Not Found`. |

#### Assertions

- Status is `201`.
- Content-Type is `text/plain`.
- Body is `Created`.
- Follow-up `GET` returns `404`.
- `token`, `bookingId`, and payload expectations are cleared.

#### Short analysis

Authenticated deletion works and cleanup is verified by an independent read. Two error-handling issues remain: deleting an unknown id returns `405` instead of `404`, and deleting the same id twice returns `405`, so the operation is not idempotent. The suite avoids double-delete assertions in CI and records both behaviors as defects.

#### Negative scenarios

| ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| NEG-DELETE-01 | No auth cookie | `403`, record still exists | `403`, record still exists | Pass |
| NEG-DELETE-02 | Unknown id with valid token | `404` | `405 Method Not Allowed` | BUG-06 |
| NEG-DELETE-03 | Delete the same id twice | `404` on the second call (idempotent) | `405 Method Not Allowed` | BUG-07 |

### 4.8 Execution result

| Metric | Result |
| --- | --- |
| Requests | 15 executed, 0 failed |
| Assertions | 77 executed, 0 failed |
| Average response time | 293 ms |
| Total run duration | 5.8 s |
| CI run | Passed (`43667906202`) |
| Sanitized artifact | Summary only; no token, password, or cookie |

---

## 5. Bug reports — Restful Booker API

### 5.1 Summary

| ID | Severity | Area | Summary |
| --- | --- | --- | --- |
| BUG-01 | Medium | Auth / status semantics | Missing credentials return `200 OK` instead of `400`/`401`. |
| BUG-02 | High | Create / validation | Missing, empty, or `null` required fields return `500` instead of `400`. |
| BUG-03 | High | Create / data integrity | Non-numeric `totalprice` is accepted and stored as `null`. |
| BUG-04 | Medium | Create / business rules | Negative `totalprice` is accepted and persisted. |
| BUG-05 | High | Create / data integrity | Invalid dates are accepted and stored as `"0NaN-aN-aN"`. |
| BUG-06 | Medium | Delete / error handling | Deleting an unknown id returns `405` instead of `404`. |
| BUG-07 | Medium | Delete / idempotency | Deleting the same booking twice returns `405` on the second call. |

**Severity guide:** **High** means the API can store corrupt or untrustworthy data. **Medium** means incorrect status/error semantics break client logic or retries. **Low** would be cosmetic or documentation-only.

### 5.2 BUG-01 — Missing credentials return `200 OK`

- **Severity:** Medium
- **Component:** `POST /auth`
- **Status:** Open

**Steps to reproduce**

1. Send `POST /auth` with `Content-Type: application/json` and body `{}`.
2. Observe the status and body.
3. Repeat with `{"username":"admin","password":"wrong"}`.

**Expected result:** `400 Bad Request` for missing fields or `401 Unauthorized` for invalid credentials; no token issued; machine-readable error.

**Actual result:** `200 OK`, `{"reason":"Bad credentials"}`; no token is issued.

**Evidence**

```text
[missing credentials body]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"reason":"Bad credentials"}
```

**Impact:** Status-code-only clients treat a failed login as success. A missing body is a malformed request and should be `400`.

**Suggested fix:** Return `400` for absent/non-string credentials and `401` for a mismatch; keep the `reason` field if backward compatibility is needed.

### 5.3 BUG-02 — Missing or `null` required booking fields return `500`

- **Severity:** High
- **Component:** `POST /booking`
- **Status:** Open

**Steps to reproduce**

1. Send `POST /booking` with body `{}`.
2. Send a body missing `firstname`.
3. Send a body where required fields are `null`.

**Expected result:** `400 Bad Request` with field-level validation errors; no booking created.

**Actual result:** `500 Internal Server Error`, `text/plain` body `Internal Server Error`; no booking created.

**Evidence**

```text
[empty object]
Status: 500
Body: Internal Server Error

[missing firstname]
Status: 500
Body: Internal Server Error

[null required fields]
Status: 500
Body: Internal Server Error
```

**Impact:** Client errors are reported as server failures, causing false alerts and unsafe retries. The API gives no actionable feedback.

**Suggested fix:** Validate the body before persistence and return `400` with field-level errors.

### 5.4 BUG-03 — Non-numeric `totalprice` is stored as `null`

- **Severity:** High
- **Component:** `POST /booking`
- **Status:** Open

**Steps to reproduce**

1. Send a valid booking with `"totalprice":"not-a-number"`.
2. Observe `200 OK`.
3. Read the created booking.

**Expected result:** `400 Bad Request`; no booking created.

**Actual result:** `200 OK`; booking created with `"totalprice": null`.

**Evidence**

```text
[string totalprice]
Status: 200
Body: {"bookingid":1159,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":null,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
```

**Impact:** Invalid data is accepted and silently corrupted. Billing or reporting logic expecting a number receives `null` while the client is told the request succeeded.

**Suggested fix:** Enforce the numeric type and return `400` on a type mismatch; never coerce invalid input to `null`.

### 5.5 BUG-04 — Negative `totalprice` is accepted

- **Severity:** Medium
- **Component:** `POST /booking`
- **Status:** Open

**Steps to reproduce**

1. Send a valid booking with `"totalprice":-100`.
2. Observe `200 OK`.
3. Read the created booking.

**Expected result:** `400 Bad Request`; no booking created.

**Actual result:** `200 OK`; booking stored with `"totalprice":-100`.

**Evidence**

```text
[negative totalprice]
Status: 200
Body: {"bookingid":1167,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":-100,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
```

**Impact:** Negative prices corrupt revenue calculations, invoices, and reconciliation; they can also become a business-logic abuse vector.

**Suggested fix:** Reject values below zero with `400` and a clear message.

### 5.6 BUG-05 — Invalid dates are stored as `"0NaN-aN-aN"`

- **Severity:** High
- **Component:** `POST /booking`
- **Status:** Open

**Steps to reproduce**

1. Send `"bookingdates":{"checkin":"not-a-date","checkout":"also-not-a-date"}`.
2. Observe `200 OK`.
3. Read the created booking.

**Expected result:** `400 Bad Request` for invalid or impossible dates; no booking created.

**Actual result:** `200 OK`; dates stored as `"0NaN-aN-aN"`.

**Evidence**

```text
[invalid date strings]
Status: 200
Body: {"bookingid":1173,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":150,"depositpaid":true,"bookingdates":{"checkin":"0NaN-aN-aN","checkout":"0NaN-aN-aN"},"additionalneeds":"Breakfast"}}
```

**Impact:** Corrupt dates break availability calendars, sorting, and date-range queries. The client cannot detect the corruption without re-reading and validating the record.

**Suggested fix:** Parse dates strictly, reject invalid or impossible dates with `400`, and verify `checkin < checkout`.

### 5.7 BUG-06 — Deleting an unknown booking returns `405`

- **Severity:** Medium
- **Component:** `DELETE /booking/:id`
- **Status:** Open

**Steps to reproduce**

1. Obtain a valid token from `POST /auth`.
2. Send `DELETE /booking/999999999` with the token.
3. Observe the status and body.

**Expected result:** `404 Not Found` because the resource does not exist.

**Actual result:** `405 Method Not Allowed`, body `Method Not Allowed`.

**Evidence**

```text
[unknown id with valid token]
Status: 405
Content-Type: text/plain; charset=utf-8
Body: Method Not Allowed
```

**Impact:** `405` falsely implies `DELETE` is unsupported. Clients may treat the response as a routing or permission problem instead of a missing record.

**Suggested fix:** Return `404` when the booking id is not found; reserve `405` for genuinely unsupported methods.

### 5.8 BUG-07 — `DELETE` is not idempotent

- **Severity:** Medium
- **Component:** `DELETE /booking/:id`
- **Status:** Open

**Steps to reproduce**

1. Create a booking and capture its id.
2. Delete it; observe `201 Created`.
3. Delete the same id again; observe `405 Method Not Allowed`.
4. Read the id; observe `404 Not Found`.

**Expected result:** The second delete returns `404` (or `204`) and remains safe to retry.

**Actual result:** The second delete returns `405 Method Not Allowed`, although the record is gone.

**Evidence**

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

**Impact:** Retries are ambiguous. A client that times out after a successful delete cannot tell whether the first attempt succeeded, the id never existed, or the method is prohibited.

**Suggested fix:** Return `404` on a delete of a missing record (consistent with BUG-06) or `204` for both the first and repeated delete; document the chosen semantics.

---

## 6. Execution evidence

### 6.1 API regression run

The Postman CLI executed the collection from `package.json`:

```text
requests:                15 executed, 0 failed
test-scripts:            30 executed, 0 failed
prerequest-scripts:      25 executed, 0 failed
assertions:              77 executed, 0 failed
total run duration:       5.8 s
average response time:    293 ms
```

### 6.2 Sanitized defect probe log

The full transcript is stored at `docs/evidence/defect-probe.log`. Auth tokens are intentionally not printed. Key evidence:

```text
Restful Booker defect probe
Target: https://restful-booker.herokuapp.com
Started: 2026-11-15T02:22:58.895Z
Note: auth tokens are intentionally not printed.

=== Authentication ===
[valid credentials] status=200, tokenIssued=true

[missing credentials body]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"reason":"Bad credentials"}

[malformed JSON body]
Status: 400
Content-Type: text/plain; charset=utf-8
Body: Bad Request

=== Create booking: baseline ===

[valid payload]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1151,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":150,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
Baseline booking id: 1151

=== Create booking: invalid payloads ===

[empty object]
Status: 500
Content-Type: text/plain; charset=utf-8
Body: Internal Server Error

[missing firstname]
Status: 500
Content-Type: text/plain; charset=utf-8
Body: Internal Server Error

[string totalprice]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1159,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":null,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
Cleanup for created booking 1159: 201 Created

[negative totalprice]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1167,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":-100,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}}
Cleanup for created booking 1167: 201 Created

[invalid date strings]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"bookingid":1173,"booking":{"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":150,"depositpaid":true,"bookingdates":{"checkin":"0NaN-aN-aN","checkout":"0NaN-aN-aN"},"additionalneeds":"Breakfast"}}
Cleanup for created booking 1173: 201 Created

[null required fields]
Status: 500
Content-Type: text/plain; charset=utf-8
Body: Internal Server Error

=== Update booking: payload validation ===

[empty object with valid token]
Status: 400
Content-Type: text/plain; charset=utf-8
Body: Bad Request

[partial payload with valid token]
Status: 400
Content-Type: text/plain; charset=utf-8
Body: Bad Request

[booking after rejected updates]
Status: 200
Content-Type: application/json; charset=utf-8
Body: {"firstname":"QA_Defect_Probe","lastname":"Automation","totalprice":150,"depositpaid":true,"bookingdates":{"checkin":"2026-12-01","checkout":"2026-12-05"},"additionalneeds":"Breakfast"}

=== Delete booking: negative cases ===

[unknown id with valid token]
Status: 405
Content-Type: text/plain; charset=utf-8
Body: Method Not Allowed

[existing id without token]
Status: 403
Content-Type: text/plain; charset=utf-8
Body: Forbidden

[existing id with valid token]
Status: 201
Content-Type: text/plain; charset=utf-8
Body: Created

[same id deleted again with valid token]
Status: 405
Content-Type: text/plain; charset=utf-8
Body: Method Not Allowed

[GET after successful delete]
Status: 404
Content-Type: text/plain; charset=utf-8
Body: Not Found

=== Cleanup ===
No extra created bookings remain.
Probe complete. Check the bug reports in docs/BUG_REPORTS.md for analysis.
```

### 6.3 CI evidence

| Item | Result |
| --- | --- |
| Workflow | `.github/workflows/api-tests.yml` |
| Run ID | `43667906202` |
| Commit | `7e7ba2d` |
| Status | Passed |
| Artifact | Sanitized summary only |
| Artifact secret check | No token, password, or cookie found |

CI steps: install from lockfile → secret scan → `npm audit --audit-level=high` → run collection → delete raw reports → upload sanitized summary.

### 6.4 Web execution evidence

The AcademyBugs web cases were **not executed** for this submission, per instruction. Therefore:

- no web pass/fail result is claimed;
- no web screenshots are included;
- the 14 cases in Section 3 are ready to run;
- the evidence column in each case states exactly what to capture when executed.

This is an intentional scope decision, not a missing API result.

### 6.5 Reproduce the API run

```bash
git clone https://github.com/Chelbeez/restful-booker-api-tests.git
cd restful-booker-api-tests
npm ci
npm test
```

Reproduce the defects:

```bash
npm run probe:defects
```

Run only the health check:

```bash
npm run test:smoke
```

---

## 7. Traceability matrix

| Requirement | Where it is covered | Evidence |
| --- | --- | --- |
| Test strategy | Section 2 | Scope, approach, risks, entry/exit criteria |
| Web test cases | Section 3 | WEB-01 to WEB-14, each with steps and expected result |
| API test cases | Section 4 | Per-endpoint request/response/assertions/analysis |
| Chained auth → create → update → get → delete | Section 4.1 | 15-request ordered collection |
| Dynamic variable chaining | Sections 4.3–4.7 | `token` and `bookingId` extracted and reused |
| Status-code assertions | Section 4 | `200`, `201`, `400`, `403`, `404` checks |
| JSON Schema assertions | Sections 4.3–4.6 | Auth, booking, create, bad-credentials schemas |
| Payload assertions | Sections 4.4–4.6 | Every submitted field compared |
| Negative scenario per endpoint | Sections 4.3–4.7 | Negative tables for auth, create, update, get, delete |
| High-quality negative scenario | Sections 4.4–4.7 | Sentinel payload + read-after-rejection + invalid input |
| Bug reports | Section 5 | Seven reports with steps and evidence |
| Expected vs actual | Section 5 | Each bug report |
| Screenshots/logs | Section 6 | API defect log and CI evidence; web intentionally not run |
| Target API documentation | Section 2.4 | Restful Booker API doc URL |
| Target web environment | Section 2.4 | AcademyBugs URL |

---

## 8. Limitations and assumptions

- **Web cases not executed.** Per instruction, AcademyBugs was not run. The web section is a documented test design, not an execution result.
- **Shared live API.** Restful Booker is a shared, stateful sandbox. Unique data reduces collisions, but other users' data is outside the suite's control.
- **Best-effort cleanup.** If the API is unavailable during `DELETE`, a uniquely tagged record may remain.
- **Vendor defects cannot be fixed here.** The suite reproduces and documents them; the API owner must change the service.
- **No load, stress, or penetration testing.** Those are outside scope.
- **No retries.** Transient failures surface in CI instead of being hidden.
- **The liveness guard is not a performance SLO.** It only prevents a hung request from blocking the run.
- **Public sandbox credentials.** Only the vendor-documented demo credentials are used; no production secrets are present.

---

## 9. Glossary

| Term | Plain-English meaning |
| --- | --- |
| API | A way for two programs to talk to each other. |
| Endpoint | A specific URL/method pair, such as `POST /booking`. |
| Request | The message sent to the API: method, URL, headers, and body. |
| Response | The message returned: status code, headers, and body. |
| Status code | A number saying what happened, such as `200` success, `400` bad request, `403` forbidden, `404` not found. |
| Header | Metadata sent with a request or response, such as `Content-Type`. |
| JSON | A text format for structured data. |
| Token | A temporary credential proving the caller may perform protected actions. |
| Assertion | An automated check, such as "status must be 200" or "price must match". |
| Schema | A definition of the required fields and types in a response. |
| Negative test | A test that deliberately sends invalid input or unauthorized requests. |
| Dynamic chaining | Using a value from one response in a later request. |
| Idempotent | Safe to repeat with the same result; repeating a delete should not produce a new error. |
| CI | Continuous integration; an automated pipeline that runs tests on every change. |
| Regression suite | Tests that protect existing behavior from breaking. |
| Defect probe | A separate script that reproduces known vendor bugs without making CI red. |

---

## 10. Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Prepared by | QA Assessment Candidate | 15 November 2026 |
| Reviewed by | ____________________ | __________ |
| Approved by | ____________________ | __________ |

**Statement:** The API results in this document are based on executed tests and sanitized evidence. The web test cases are documented designs and were not executed for this submission, per instruction.
