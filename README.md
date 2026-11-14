# Restful Booker API Test Suite

[![API tests](https://github.com/Chelbeez/restful-booker-api-tests/actions/workflows/api-tests.yml/badge.svg)](https://github.com/Chelbeez/restful-booker-api-tests/actions/workflows/api-tests.yml)

A stateful API test suite for the [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html) live sandbox. It is delivered as a Postman v2.1 collection and runs in the Postman GUI or with the official Postman CLI.

The suite covers a full auth → create → update → verify → delete workflow, with dynamic variable chaining, contract and payload assertions, negative security checks, and cleanup verification.

## What this demonstrates

| Area | Implementation |
| --- | --- |
| Dynamic chaining | Extracts `token` from `POST /auth` and `bookingid` from `POST /booking`, then uses both in downstream requests. |
| Robust assertions | Status codes, content types, JSON Schema, exact payload matching, state-change checks, and response-time guard. |
| Negative testing | `PUT` without a token and with an invalid token; invalid credentials; unknown resource. |
| State integrity | A read-after-rejection check proves the two unauthorized writes did not mutate the booking. |
| Cleanup | Deletes the created booking, confirms `404`, and clears runtime token/test data. |
| Security hygiene | No committed secrets, HTTPS enforcement, ephemeral token handling, sanitized CI reports, secret scan, and clean `npm audit`. |
| CI | GitHub Actions runs the collection, secret scan, dependency audit, and uploads only a sanitized run summary. |

## Assessment alignment

- **Chained flow:** auth → create → update → verify → delete, executed in one ordered collection.
- **Dynamic variable chaining:** `token` and `bookingid` are extracted from responses and injected into downstream URLs/headers.
- **Robust assertions:** status codes, content types, JSON Schema, exact payload equality, specific business fields, and persisted-state checks.
- **Negative testing:** `PUT` without a token and with an invalid token, invalid credentials, unknown resource, and a read-after-rejection integrity check.
- **Cleanup:** the created booking is deleted and a follow-up `GET` confirms `404`.
- **Deliverable:** exported Postman v2.1 collection plus environment, test plan, security policy, and CI configuration.

## Test flow

| Step | Request | Chained state | Main assertions |
| --- | --- | --- | --- |
| 0 | `GET /ping` | — | `201`, `text/plain`, body `Created` |
| 1 | `POST /auth` | stores `token` | `200`, JSON Schema, token present/non-empty |
| 2 | `POST /booking` | stores `bookingId` | `200`, create schema, positive integer id, exact payload match |
| 3 | `PUT /booking/:id` | uses `token` + `bookingId` | `200`, booking schema, exact updated payload, changed from original |
| 4 | `GET /booking/:id` | uses `bookingId` | `200`, updated data persisted on an independent read |
| 5 | `PUT /booking/:id` without token | uses `bookingId` | `403`, `Forbidden`, no mutation |
| 6 | `PUT /booking/:id` with invalid token | uses `bookingId` | `403`, `Forbidden` |
| 7 | `POST /auth` with bad password | — | `200` + `reason: Bad credentials`, no token issued |
| 8 | `GET /booking/999999999` | — | `404`, `Not Found` |
| 9 | `GET /booking/:id` after rejected writes | uses `bookingId` | Booking still equals the last authorized update |
| 10 | `DELETE /booking/:id` | uses `token` + `bookingId` | `201`, body `Created` |
| 11 | `GET /booking/:id` after delete | uses `bookingId` | `404`, then clears ephemeral variables |

The collection executes **12 requests and 65 assertions**.

## Repository layout

```text
.
├── .github/
│   ├── dependabot.yml
│   └── workflows/api-tests.yml
├── docs/
│   └── TEST_PLAN.md
├── postman/
│   ├── RestfulBooker.postman_collection.json
│   └── RestfulBooker.postman_environment.json
├── reports/
│   └── .gitkeep
├── scripts/
│   ├── redact-reports.mjs
│   └── secret-scan.mjs
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .nvmrc
├── LICENSE
├── README.md
├── SECURITY.md
└── package.json
```

## Quick start

### Prerequisites

- Node.js 20 or newer (Node 24 LTS recommended)
- npm
- No Postman account is required for local Postman CLI runs

### Run with the Postman CLI

```bash
npm ci
npm test
```

Run just the stateless health check:

```bash
npm run test:smoke
```

The run summary is written to `reports/*.collection-run-summary.yaml`.

> The Postman CLI also writes a raw execution report containing request headers, request bodies, and response bodies. That file can contain the auth token and demo password. `npm run reports:redact` deletes it; CI runs that step automatically and uploads only the summary. Do not commit or share the raw execution file.

### Run in the Postman GUI

1. Import `postman/RestfulBooker.postman_collection.json`.
2. Import `postman/RestfulBooker.postman_environment.json`.
3. Select the **Restful Booker - Public Sandbox** environment.
4. Open the collection runner and run the collection in order.

The negative and cleanup folders depend on the booking created by the happy-path folder. Run the **full collection**, not an individual request, unless you intentionally want to test a single step.

## Configuration

The environment file contains only the public Restful Booker demo credentials. They are published in the API documentation and are not production secrets.

| Variable | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `https://restful-booker.herokuapp.com` | Target API. HTTPS is enforced for non-local hosts. |
| `username` | `admin` | Public sandbox username. |
| `password` | `password123` | Public sandbox password. Marked as a secret in the Postman environment. |

For a real environment:

- Create a separate environment and never commit it.
- Use Postman Vault, CI secrets, or an external secret manager for credentials.
- Use a dedicated test account with the least privilege required.
- Keep `baseUrl` on HTTPS. The collection allows HTTP only for `localhost`/`127.0.0.1`.

## Assertion strategy

The suite intentionally combines several layers rather than relying on status codes alone:

1. **Transport/status** — expected HTTP status and content type.
2. **Contract** — JSON Schema for auth, booking, create-booking, and bad-credentials responses.
3. **Exact payload** — deep equality against the dynamic payload the test sent.
4. **Specific business data** — updated firstname, price, deposit flag, dates, and additional needs.
5. **State transition** — update differs from the original, and a fresh `GET` returns the updated record.
6. **Authorization integrity** — rejected writes return `403` and leave the record unchanged.
7. **Cleanup** — `DELETE` succeeds and a subsequent `GET` returns `404`.
8. **Liveness** — each response must complete within a generous 30-second guard; this is not a performance SLO.

JSON Schemas require the critical fields and types but allow additive fields (`additionalProperties: true`). This keeps the contract meaningful without failing on benign, additive API changes.

## Negative and security coverage

- `PUT /booking/:id` with **no auth cookie** → `403 Forbidden`.
- `PUT /booking/:id` with an **invalid token** → `403 Forbidden`.
- Both unauthorized requests use a **sentinel payload**; the follow-up `GET` proves the sentinel was never persisted.
- `POST /auth` with a wrong password → documents Restful Booker's `200` + `reason` behavior and asserts that **no token** is returned.
- `GET /booking/:id` for an unknown id → `404 Not Found`.

## Security practices

- **No real secrets in git.** Only the publicly documented sandbox credentials are present.
- **Ephemeral token.** The auth token is stored in a collection variable, never logged, and unset during cleanup. Auth also clears any stale token at the start of a new run.
- **Fail-closed chaining.** Auth and create clear stale state first, so a failed run cannot mutate a booking from an earlier run.
- **HTTPS guard.** A collection-level pre-request script refuses to send credentials to a non-local HTTP URL.
- **Data minimization.** Test payloads contain no PII and use a unique run suffix; cleanup removes the created record.
- **Report redaction.** Raw Postman CLI execution YAML is deleted before artifacts are shared; only the summary is uploaded.
- **Least-privilege CI.** The workflow uses `permissions: contents: read`, a read-only dependency install, and no repository secrets.
- **Supply-chain checks.** `npm audit` is clean, dependencies are pinned by lockfile, Dependabot monitors npm and GitHub Actions, and a local secret scan runs in CI.
- **Responsible disclosure.** See [SECURITY.md](SECURITY.md).

## CI

The workflow at `.github/workflows/api-tests.yml` runs on:

- pushes to `main`
- pull requests
- manual dispatch
- a weekly schedule (to detect live-API drift)

It installs from the lockfile, runs the secret scan, audits dependencies, executes the collection, redacts raw reports, and uploads the sanitized summary. The job also uploads the summary when tests fail, so failure details remain available without exposing tokens or request bodies.

## Design decisions and limitations

- **Live shared API.** Restful Booker is stateful and shared. The suite uses a unique suffix and dynamic dates to avoid collisions, but it cannot control other users' data.
- **Best-effort cleanup.** If the API is unavailable during `DELETE`, the record may remain. The unique payload makes it identifiable without affecting other tests.
- **Documented API quirks.** `GET /ping` returns `201 Created`; bad credentials return `200` with a reason; `DELETE` returns `201 Created`. Assertions follow observed behavior and are explained in the collection descriptions and test plan.
- **Forward-compatible schemas.** Additive response fields are allowed; required fields, types, and date formats are still validated.
- **Functional scope only.** This is not a load, stress, penetration, or UI test suite.
- **No retries.** Transient failures surface in CI rather than being hidden. The 30-second request timeout is a liveness guard, not a performance target.

See [docs/TEST_PLAN.md](docs/TEST_PLAN.md) for scope, risks, scenarios, traceability, entry/exit criteria, and reporting details.

## License

[MIT](LICENSE)
