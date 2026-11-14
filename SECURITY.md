# Security Policy

## Supported versions

This repository is a QA assessment/test artifact. Use the latest commit on the `main` branch.

## Reporting a vulnerability

Please do not open a public issue for a security concern.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Include the affected file/request, reproduction steps, and potential impact.

If private reporting is unavailable, contact the repository owner through GitHub and ask for a private channel before sharing details.

## Security posture

This repository is intentionally public and uses a public sandbox. The controls below are designed to keep it that way safely:

- **No production secrets.** The only credentials present are the Restful Booker demo credentials published in the API documentation.
- **Ephemeral token.** The auth token is stored in a Postman collection variable, not the environment file. It is never logged and is unset during cleanup. Auth clears any stale token at the start of a new run.
- **Fresh state.** Auth clears any old token; create clears any old `bookingId` before making a new record. A failed run cannot accidentally update a record from a previous run.
- **HTTPS enforcement.** A collection-level pre-request rejects non-local HTTP URLs so credentials cannot be sent over plaintext HTTP.
- **Synthetic test data.** Payloads contain no PII and use a unique run suffix.
- **Best-effort cleanup.** The suite deletes its booking and verifies `404`. If the API is unavailable during cleanup, the uniquely tagged record may remain in the shared sandbox.
- **Report redaction.** Postman CLI raw execution YAML contains request/response bodies and headers. `npm run reports:redact` deletes it; CI uploads only the sanitized summary.
- **Least-privilege CI.** The workflow uses `permissions: contents: read` and no repository secrets.
- **Supply-chain checks.** Dependencies are locked, `npm audit` is expected to pass, Dependabot monitors npm and GitHub Actions, and a local secret scan runs in CI.

## Working with a real environment

Do not edit the committed environment file with real credentials. Instead:

1. Create a separate local/CI environment.
2. Use Postman Vault, CI secrets, or an external secret manager.
3. Use a dedicated test account with the least privilege needed.
4. Keep `baseUrl` on HTTPS.
5. Never commit exported reports or environment files from a real run.

If a real secret is ever committed, rotate it immediately and purge it from git history. Deleting the file in a later commit is not sufficient.

## Scope

Security testing of the Restful Booker service itself is outside this repository's scope. Report issues in that service to its maintainers, not here.
