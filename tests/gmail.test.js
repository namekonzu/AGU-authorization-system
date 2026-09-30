const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.AGUEmailParser = require('../background/email-parser.js');
const gmail = require('../background/gmail.js');

const fixtureDir = path.join(__dirname, 'fixtures');
const readFixture = (name) => JSON.parse(
  fs.readFileSync(path.join(fixtureDir, name), 'utf8')
);

function mockFetch(responses, calls) {
  return async function (url) {
    calls.push(String(url));
    if (String(url).includes('/messages?')) {
      return { ok: true, json: async () => responses.list };
    }

    const id = String(url).match(/messages\/([^?]+)/)[1];
    return { ok: true, json: async () => responses[id] };
  };
}

test('searches by exact sender and selects the newest valid OTP', async () => {
  const calls = [];
  const responses = {
    list: readFixture('gmail-list.json'),
    'old-message': readFixture('message-old.json'),
    'older-message': readFixture('message-older.json'),
    'latest-message': readFixture('message-latest.json')
  };
  const previousFetch = global.fetch;
  global.fetch = mockFetch(responses, calls);

  try {
    const result = await gmail.findLatestAguOtp('test-token', 1700000600000);
    assert.deepEqual(result, {
      ok: true,
      status: 'OTP_FOUND',
      code: '637237',
      receivedAt: 1700000540000
    });

    const requestUrl = new URL(calls[0]);
    assert.equal(
      requestUrl.searchParams.get('q'),
      'from:agsso-noreply@aoyamagakuin.jp newer_than:1d'
    );
    assert.equal(requestUrl.searchParams.get('maxResults'), '10');
  } finally {
    global.fetch = previousFetch;
  }
});

test('prefers text/plain over a conflicting HTML alternative', async () => {
  const calls = [];
  const previousFetch = global.fetch;
  global.fetch = mockFetch({
    list: { messages: [{ id: 'older-message' }] },
    'older-message': readFixture('message-older.json')
  }, calls);

  try {
    const result = await gmail.findLatestAguOtp('test-token', 1700000600000);
    assert.equal(result.code, '123456');
  } finally {
    global.fetch = previousFetch;
  }
});

test('returns WAITING_FOR_EMAIL when the sender has no matching messages', async () => {
  const previousFetch = global.fetch;
  global.fetch = mockFetch({ list: { messages: [] } }, []);

  try {
    assert.deepEqual(
      await gmail.findLatestAguOtp('test-token', 1700000600000),
      { ok: false, status: 'WAITING_FOR_EMAIL' }
    );
  } finally {
    global.fetch = previousFetch;
  }
});

test('rejects an old matching message with OTP_TOO_OLD', async () => {
  const previousFetch = global.fetch;
  global.fetch = mockFetch({
    list: { messages: [{ id: 'old-message' }] },
    'old-message': readFixture('message-old.json')
  }, []);

  try {
    assert.deepEqual(
      await gmail.findLatestAguOtp('test-token', 1700000600000),
      { ok: false, status: 'OTP_TOO_OLD' }
    );
  } finally {
    global.fetch = previousFetch;
  }
});

test('does not accept a message from another sender', async () => {
  const fakeMessage = readFixture('message-latest.json');
  fakeMessage.payload.headers[0].value = 'Fake sender <fake@example.com>';
  const previousFetch = global.fetch;
  global.fetch = mockFetch({
    list: { messages: [{ id: 'fake-message' }] },
    'fake-message': fakeMessage
  }, []);

  try {
    assert.deepEqual(
      await gmail.findLatestAguOtp('test-token', 1700000600000),
      { ok: false, status: 'WAITING_FOR_EMAIL' }
    );
  } finally {
    global.fetch = previousFetch;
  }
});
