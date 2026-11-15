#!/usr/bin/env node
/**
 * Reproducible defect probe for the Restful Booker live sandbox.
 *
 * This is NOT part of the regression suite. It intentionally sends invalid
 * payloads, records the observed behavior, and removes any bookings it creates.
 * It never prints an auth token.
 *
 * Usage: npm run probe:defects
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const environmentPath = path.join(process.cwd(), 'postman', 'RestfulBooker.postman_environment.json');
const environment = JSON.parse(await readFile(environmentPath, 'utf8'));
const values = Object.fromEntries(
  environment.values.filter((item) => item.enabled !== false).map((item) => [item.key, item.value]),
);

const baseUrl = values.baseUrl;
const username = values.username;
const password = values.password;

if (!baseUrl || !username || !password) {
  throw new Error('Missing baseUrl/username/password in the Postman environment file.');
}

const createdBookingIds = new Set();
let authToken;

async function request(method, requestPath, { token, body, rawBody } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined || rawBody !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Cookie = `token=${token}`;
  }

  const response = await fetch(baseUrl + requestPath, {
    method,
    headers,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text,
    json,
  };
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function printResult(label, result, { omitBody = false } = {}) {
  console.log(`\n[${label}]`);
  console.log(`Status: ${result.status}`);
  console.log(`Content-Type: ${result.contentType}`);
  if (!omitBody) {
    console.log(`Body: ${result.text}`);
  }
}

async function safeDelete(bookingId, label) {
  if (!authToken) return;
  const result = await request('DELETE', `/booking/${bookingId}`, { token: authToken });
  console.log(`Cleanup ${label}: ${result.status} ${result.text}`);
  if (result.status === 201) {
    createdBookingIds.delete(bookingId);
  } else {
    process.exitCode = 1;
  }
}

function trackCreatedBooking(result) {
  if (result.json && Number.isInteger(result.json.bookingid)) {
    createdBookingIds.add(result.json.bookingid);
    return result.json.bookingid;
  }
  return undefined;
}

const validBooking = {
  firstname: 'QA_Defect_Probe',
  lastname: 'Automation',
  totalprice: 150,
  depositpaid: true,
  bookingdates: { checkin: '2026-12-01', checkout: '2026-12-05' },
  additionalneeds: 'Breakfast',
};

console.log('Restful Booker defect probe');
console.log(`Target: ${baseUrl}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log('Note: auth tokens are intentionally not printed.');

section('Authentication');
const auth = await request('POST', '/auth', { body: { username, password } });
authToken = auth.json && auth.json.token;
console.log(`[valid credentials] status=${auth.status}, tokenIssued=${Boolean(authToken)}`);
if (!authToken) {
  throw new Error('Could not obtain an auth token; the probe cannot continue.');
}

printResult(
  'missing credentials body',
  await request('POST', '/auth', { body: {} }),
);

printResult(
  'malformed JSON body',
  await request('POST', '/auth', { rawBody: '{"username":' }),
);

section('Create booking: baseline');
const baselineCreate = await request('POST', '/booking', { body: validBooking });
printResult('valid payload', baselineCreate);
const baselineId = trackCreatedBooking(baselineCreate);
if (!baselineId) {
  throw new Error('Could not create a baseline booking; the probe cannot continue.');
}
console.log(`Baseline booking id: ${baselineId}`);

section('Create booking: invalid payloads');
const invalidCreateCases = [
  ['empty object', {}],
  [
    'missing firstname',
    {
      lastname: 'Automation',
      totalprice: 100,
      depositpaid: true,
      bookingdates: { checkin: '2026-12-01', checkout: '2026-12-05' },
    },
  ],
  ['string totalprice', { ...validBooking, totalprice: 'not-a-number' }],
  ['negative totalprice', { ...validBooking, totalprice: -100 }],
  ['invalid date strings', { ...validBooking, bookingdates: { checkin: 'not-a-date', checkout: 'also-not-a-date' } }],
  [
    'null required fields',
    {
      firstname: null,
      lastname: null,
      totalprice: null,
      depositpaid: null,
      bookingdates: null,
      additionalneeds: null,
    },
  ],
];

for (const [label, payload] of invalidCreateCases) {
  const result = await request('POST', '/booking', { body: payload });
  printResult(label, result);
  const createdId = trackCreatedBooking(result);
  if (createdId) {
    await safeDelete(createdId, `for created booking ${createdId}`);
  }
}

section('Update booking: payload validation');
printResult(
  'empty object with valid token',
  await request('PUT', `/booking/${baselineId}`, { token: authToken, body: {} }),
);
printResult(
  'partial payload with valid token',
  await request('PUT', `/booking/${baselineId}`, {
    token: authToken,
    body: { firstname: 'QA_Partial', totalprice: 50 },
  }),
);
printResult(
  'booking after rejected updates',
  await request('GET', `/booking/${baselineId}`),
);

section('Delete booking: negative cases');
printResult(
  'unknown id with valid token',
  await request('DELETE', '/booking/999999999', { token: authToken }),
);
printResult(
  'existing id without token',
  await request('DELETE', `/booking/${baselineId}`),
);
const baselineDelete = await request('DELETE', `/booking/${baselineId}`, { token: authToken });
printResult('existing id with valid token', baselineDelete);
if (baselineDelete.status === 201) {
  createdBookingIds.delete(baselineId);
}
printResult(
  'same id deleted again with valid token',
  await request('DELETE', `/booking/${baselineId}`, { token: authToken }),
);
printResult(
  'GET after successful delete',
  await request('GET', `/booking/${baselineId}`),
);

section('Cleanup');
const remainingIds = [...createdBookingIds];
if (remainingIds.length === 0) {
  console.log('No extra created bookings remain.');
} else {
  for (const id of remainingIds) {
    await safeDelete(id, `for leftover booking ${id}`);
  }
}
console.log('Probe complete. Check the bug reports in docs/BUG_REPORTS.md for analysis.');
