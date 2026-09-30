/**
 * Gmail payload decoding and OTP extraction helpers.
 *
 * This file intentionally has no Chrome-specific dependencies so it can be
 * tested with Node.js as well as loaded by the MV3 service worker.
 */
(function (root, factory) {
  const api = factory();
  root.AGUEmailParser = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function decodeBase64Url(value) {
    if (!value) return '';

    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }

    return binary;
  }

  function decodeHtmlEntities(value) {
    const namedEntities = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"'
    };

    return value
      .replace(/&#x([0-9a-f]+);?/gi, function (_, hex) {
        return String.fromCodePoint(parseInt(hex, 16));
      })
      .replace(/&#([0-9]+);?/g, function (_, decimal) {
        return String.fromCodePoint(parseInt(decimal, 10));
      })
      .replace(/&([a-z]+);?/gi, function (match, name) {
        return Object.prototype.hasOwnProperty.call(namedEntities, name.toLowerCase())
          ? namedEntities[name.toLowerCase()]
          : match;
      });
  }

  function htmlToText(html) {
    if (!html) return '';

    return decodeHtmlEntities(
      html
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\s*(br|hr)\s*\/?>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/[ \t\f\r]+/g, ' ')
        .replace(/\n\s+/g, '\n')
    ).trim();
  }

  function extractTextFromPayload(payload) {
    if (!payload) return '';

    const plainText = [];
    const htmlText = [];

    function visit(part) {
      if (!part) return;
      const mimeType = String(part.mimeType || '').toLowerCase();

      if (part.body && part.body.data) {
        const decoded = decodeBase64Url(part.body.data);
        if (mimeType === 'text/plain') plainText.push(decoded);
        if (mimeType === 'text/html') htmlText.push(htmlToText(decoded));
      }

      if (Array.isArray(part.parts)) {
        part.parts.forEach(visit);
      }
    }

    visit(payload);
    return (plainText.length ? plainText : htmlText).filter(Boolean).join('\n').trim();
  }

  function extractOtpCode(text) {
    if (!text) return null;

    // Require the label near the six-digit value. This avoids treating an
    // unrelated number in an email as an authentication code.
    const match = String(text).match(
      /認証[\s\u3000]*番号(?:[\s\u3000]*(?:は|が|:|：))?[\s\u3000]*([0-9]{6})(?![0-9])(?:[\s\u3000]*(?:です|デス))?/i
    );

    return match ? match[1] : null;
  }

  return {
    decodeBase64Url,
    extractOtpCode,
    extractTextFromPayload,
    htmlToText
  };
});
