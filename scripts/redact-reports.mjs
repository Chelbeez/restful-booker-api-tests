#!/usr/bin/env node
/**
 * Postman CLI execution reports contain request headers, request bodies, and
 * response bodies. Those can include auth tokens and credentials.
 *
 * Keep only the summary YAML, which contains run metadata, counts, and failure
 * messages. Delete the raw executions YAML before anything is shared or
 * uploaded as a CI artifact.
 */
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const reportsDirectory = path.join(process.cwd(), 'reports');

try {
  const files = await readdir(reportsDirectory);
  const rawReports = files.filter((file) => file.endsWith('.collection-run-executions.yaml'));

  await Promise.all(
    rawReports.map((file) => unlink(path.join(reportsDirectory, file))),
  );

  console.log(
    `Redacted ${rawReports.length} raw execution report(s); sanitized summaries remain in reports/.`,
  );
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('No reports directory found; nothing to redact.');
    process.exit(0);
  }
  throw error;
}
