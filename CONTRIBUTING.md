# Contributing

## Before opening a pull request

1. Install dependencies with `npm ci`.
2. Run `npm run verify`.
3. Run `npm run reports:redact` before sharing any generated report.
4. Confirm the suite leaves no record behind: the final `GET` must return `404`.

## Change guidelines

- Keep the collection runnable in order from start to finish.
- Preserve dynamic chaining: do not hard-code a token or booking id.
- Add assertions at the right layer: status, content type, schema, submitted-field equality, and state where relevant.
- Keep negative tests isolated from the happy-path record's expected values; use a sentinel payload.
- Update `docs/TEST_PLAN.md` when scenarios, assertions, or API behavior change.
- Do not commit `.env` files, real credentials, raw Postman execution reports, `node_modules`, or generated summaries.
- Do not add a real secret to the collection, environment, test scripts, or CI workflow.

## Commit style

Use a short imperative subject, for example:

```text
Add unauthorized-update state integrity check
```

## Reporting issues

For security issues, follow [SECURITY.md](SECURITY.md). For functional defects, include the failing request name, expected vs. actual result, and the sanitized run summary.
