/* global AGUGmail */

importScripts('email-parser.js', 'gmail.js');

const STORAGE_KEY = 'googleConnected';

function sendResult(sendResponse, result) {
  sendResponse(result);
  return false;
}

function publicError(error) {
  if (error && error.code === 'AUTH_REQUIRED') {
    return {
      ok: false,
      status: 'AUTH_REQUIRED',
      error: 'Googleアカウントに接続してください。'
    };
  }
  if (error && (error.status === 401 || error.status === 403)) {
    return {
      ok: false,
      status: 'GMAIL_API_ERROR',
      error: 'Gmailへのアクセスに失敗しました。'
    };
  }
  return {
    ok: false,
    status: 'BACKGROUND_ERROR',
    error: '認証番号を取得できませんでした。時間をおいて再試行してください。'
  };
}

async function getConnectionStatus() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return Boolean(stored[STORAGE_KEY]);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) return false;

  if (message.type === 'GET_CONNECTION_STATUS') {
    getConnectionStatus()
      .then(function (connected) {
        sendResult(sendResponse, { ok: true, connected });
      })
      .catch(function () {
        sendResult(sendResponse, { ok: true, connected: false });
      });
    return true;
  }

  if (message.type === 'CONNECT_GOOGLE_ACCOUNT') {
    AGUGmail.getGoogleAccessToken(true)
      .then(function () {
        return chrome.storage.local.set({ [STORAGE_KEY]: true });
      })
      .then(function () {
        sendResult(sendResponse, { ok: true, status: 'CONNECTED', connected: true });
      })
      .catch(function (error) {
        sendResult(sendResponse, publicError(error));
      });
    return true;
  }

  if (message.type === 'DISCONNECT_GOOGLE_ACCOUNT') {
    AGUGmail.getGoogleAccessToken(false)
      .then(function (token) {
        chrome.identity.removeCachedAuthToken({ token });
      })
      .catch(function () {
        // There may be no cached token. The local connection state still
        // needs to be cleared in that case.
      })
      .then(function () {
        return chrome.storage.local.remove(STORAGE_KEY);
      })
      .then(function () {
        sendResult(sendResponse, { ok: true, status: 'DISCONNECTED', connected: false });
      })
      .catch(function (error) {
        sendResult(sendResponse, publicError(error));
      });
    return true;
  }

  if (message.type === 'GET_LATEST_AGU_OTP') {
    AGUGmail.fetchLatestAguOtp({ interactive: false })
      .then(function (result) {
        sendResult(sendResponse, result);
      })
      .catch(function (error) {
        sendResult(sendResponse, publicError(error));
      });
    return true;
  }

  return false;
});
