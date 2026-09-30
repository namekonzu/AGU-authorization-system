/**
 * Gmail API access for the MV3 service worker.
 *
 * The access token is held only in local variables for the duration of a
 * request. Message bodies and OTPs are never written to chrome.storage.
 */
(function (root, factory) {
  const api = factory(root.AGUEmailParser);
  root.AGUGmail = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (parser) {
  'use strict';

  const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const EXPECTED_SENDER = 'agsso-noreply@aoyamagakuin.jp';
  const OTP_MAX_AGE_MS = 10 * 60 * 1000;

  function getGoogleAccessToken(interactive) {
    return new Promise(function (resolve, reject) {
      chrome.identity.getAuthToken({ interactive: Boolean(interactive) }, function (token) {
        if (chrome.runtime.lastError) {
          const error = new Error(chrome.runtime.lastError.message);
          error.code = 'AUTH_REQUIRED';
          reject(error);
          return;
        }

        if (!token) {
          const error = new Error('Googleアカウントに接続されていません。');
          error.code = 'AUTH_REQUIRED';
          reject(error);
          return;
        }

        resolve(token);
      });
    });
  }

  function getHeader(headers, name) {
    const header = (headers || []).find(function (item) {
      return String(item.name || '').toLowerCase() === name.toLowerCase();
    });
    return header ? String(header.value || '') : '';
  }

  function extractEmailAddress(value) {
    const sender = String(value || '').trim();
    const angleAddress = sender.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
    if (angleAddress) return angleAddress[1].toLowerCase();

    const plainAddress = sender.match(/\b[^\s<>@]+@[^\s<>@]+\b/);
    return plainAddress ? plainAddress[0].toLowerCase() : '';
  }

  function isAllowedSender(sender) {
    return extractEmailAddress(sender) === EXPECTED_SENDER;
  }

  function isAguOtpBody(body) {
    return body.includes('青山学院') && body.includes('認証番号');
  }

  async function gmailRequest(path, token) {
    const response = await fetch(GMAIL_API_BASE + path, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token
      }
    });

    if (!response.ok) {
      const error = new Error('Gmail API request failed');
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async function searchAguOtpMessages(token) {
    const query = encodeURIComponent(
      'from:' + EXPECTED_SENDER + ' newer_than:1d'
    );
    return gmailRequest('/messages?q=' + query + '&maxResults=10', token);
  }

  async function getMessage(messageId, token) {
    return gmailRequest('/messages/' + encodeURIComponent(messageId) + '?format=full', token);
  }

  function isRecent(internalDate, now) {
    const receivedAt = Number(internalDate);
    return Number.isFinite(receivedAt) && receivedAt <= now && now - receivedAt <= OTP_MAX_AGE_MS;
  }

  async function findLatestAguOtp(token, now) {
    const list = await searchAguOtpMessages(token);
    const messages = Array.isArray(list.messages) ? list.messages : [];
    let latest = null;
    let senderMatched = false;
    let oldCandidateFound = false;
    let bodyMatched = false;

    for (const item of messages) {
      if (!item || !item.id) continue;
      const message = await getMessage(item.id, token);
      const headers = message.payload && message.payload.headers;
      const sender = getHeader(headers, 'From');

      if (!isAllowedSender(sender)) continue;
      senderMatched = true;

      if (!isRecent(message.internalDate, now)) {
        oldCandidateFound = true;
        continue;
      }

      const body = parser.extractTextFromPayload(message.payload);
      if (!isAguOtpBody(body)) continue;
      bodyMatched = true;

      const code = parser.extractOtpCode(body);
      if (code && (!latest || Number(message.internalDate) > latest.receivedAt)) {
        latest = {
          code,
          receivedAt: Number(message.internalDate)
        };
      }
    }

    if (latest) {
      return {
        ok: true,
        status: 'OTP_FOUND',
        code: latest.code,
        receivedAt: latest.receivedAt
      };
    }

    if (oldCandidateFound) {
      return { ok: false, status: 'OTP_TOO_OLD' };
    }
    if (!messages.length || !senderMatched) {
      return { ok: false, status: 'WAITING_FOR_EMAIL' };
    }
    if (!bodyMatched) {
      return { ok: false, status: 'OTP_NOT_FOUND' };
    }

    return { ok: false, status: 'OTP_NOT_FOUND' };
  }

  async function fetchLatestAguOtp(options) {
    const token = await getGoogleAccessToken(options && options.interactive);

    try {
      return await findLatestAguOtp(token, Date.now());
    } catch (error) {
      if (error && error.status === 401) {
        await new Promise(function (resolve) {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
        const retryToken = await getGoogleAccessToken(false);
        return findLatestAguOtp(retryToken, Date.now());
      }
      throw error;
    }
  }

  return {
    EXPECTED_SENDER,
    fetchLatestAguOtp,
    extractEmailAddress,
    findLatestAguOtp,
    getGoogleAccessToken,
    getMessage,
    searchAguOtpMessages
  };
});
