#!/usr/bin/env node
/**
 * Lightweight, dependency-free secret scan for the working tree.
 *
 * This is a fast guardrail, not a replacement for GitHub secret scanning,
 * gitleaks/trufflehog, or a proper pre-commit hook. It intentionally reports
 * only file, line, and rule name so a matched secret is never echoed to logs.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'node_modules', 'reports', '.postman', '.vscode', '.idea']);
const ignoredFiles = new Set(['package-lock.json']);

const rules = [
  {
    name: 'GitHub token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    name: 'AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: 'Private key block',
    pattern: new RegExp('-----BEGIN (?:RSA |EC |OPENSSH |DSA )?' + 'PRIVATE KEY-----', 'g'),
  },
  {
    name: 'Slack token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    name: 'Google API key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: 'JWT',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: 'Bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{24,}=*/g,
  },
];

const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walk(path.join(directory, entry.name));
      }
      continue;
    }

    if (!entry.isFile() || ignoredFiles.has(entry.name)) {
      continue;
    }

    const filePath = path.join(directory, entry.name);
    const info = await stat(filePath);
    if (info.size > 2 * 1024 * 1024) {
      continue;
    }

    let content;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      continue; // Binary or unreadable file.
    }

    const lines = content.split(/\r?\n/);
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      for (let index = 0; index < lines.length; index += 1) {
        if (rule.pattern.test(lines[index])) {
          findings.push({
            file: path.relative(root, filePath),
            line: index + 1,
            rule: rule.name,
          });
        }
        rule.pattern.lastIndex = 0;
      }
    }
  }
}

await walk(root);

if (findings.length === 0) {
  console.log('Secret scan passed: no high-confidence secrets found in tracked-style files.');
  process.exit(0);
}

console.error(`Secret scan failed: ${findings.length} potential secret(s) found.`);
for (const finding of findings) {
  console.error(`- ${finding.rule} at ${finding.file}:${finding.line} (value redacted)`);
}
console.error('Remove the value, rotate it if it was real, and purge it from git history before publishing.');
process.exit(1);
