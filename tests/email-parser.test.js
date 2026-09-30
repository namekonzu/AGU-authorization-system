const test = require('node:test');
const assert = require('node:assert/strict');
const parser = require('../background/email-parser.js');

function base64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

test('extracts an OTP from plain text', () => {
  assert.equal(parser.extractOtpCode('青山学院からのメールです。\n認証番号は 123456 です。'), '123456');
});

test('handles whitespace and full-width punctuation around the label', () => {
  assert.equal(parser.extractOtpCode('認証番号：\n 654321'), '654321');
  assert.equal(parser.extractOtpCode('認証番号は\u3000 654321\nです。'), '654321');
});

test('does not accept codes without the authentication label', () => {
  assert.equal(parser.extractOtpCode('注文番号 123456'), null);
});

test('does not accept five, seven, or embedded digits', () => {
  assert.equal(parser.extractOtpCode('認証番号 12345'), null);
  assert.equal(parser.extractOtpCode('認証番号 1234567'), null);
  assert.equal(parser.extractOtpCode('認証番号 A123456B'), null);
});

test('decodes nested multipart payloads', () => {
  const payload = {
    mimeType: 'multipart/alternative',
    parts: [
      {
        mimeType: 'text/plain',
        body: { data: base64Url('認証番号 123456') }
      },
      {
        mimeType: 'text/html',
        body: { data: base64Url('<p>認証番号：<strong>654321</strong></p>') }
      }
    ]
  };

  assert.match(parser.extractTextFromPayload(payload), /認証番号 123456/);
  assert.doesNotMatch(parser.extractTextFromPayload(payload), /654321/);
});

test('uses HTML when a multipart payload has no plain-text part', () => {
  const payload = {
    mimeType: 'multipart/alternative',
    parts: [
      {
        mimeType: 'text/html',
        body: { data: base64Url('<p>認証番号：<strong>654321</strong></p>') }
      }
    ]
  };

  assert.equal(parser.extractOtpCode(parser.extractTextFromPayload(payload)), '654321');
});

test('converts HTML entities before extracting', () => {
  const html = '<p>認証番号&nbsp;:&nbsp;&#49;&#50;&#51;&#52;&#53;&#54;</p>';
  assert.equal(parser.extractOtpCode(parser.htmlToText(html)), '123456');
});
