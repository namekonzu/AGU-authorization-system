(function () {
  'use strict';

  const POLL_INTERVAL_MS = 3000;
  const POLL_TIMEOUT_MS = 60000;
  const UI_ID = 'agu-auth-helper-suggestion';
  const INPUT_HINT_RE = /(認証|番号|otp|one.?time|verification|verify|code|token)/i;
  let currentInput = null;
  let currentCode = null;
  let pollStartedAt = 0;
  let pollTimer = null;
  let observerTimer = null;

  const STATUS_MESSAGES = {
    WAITING_FOR_EMAIL: '認証メールを待っています…',
    AUTH_REQUIRED: 'Googleアカウントに接続してください。',
    GMAIL_API_ERROR: 'Gmailへのアクセスに失敗しました。',
    OTP_NOT_FOUND: '認証メールの本文から番号を見つけられませんでした。',
    OTP_TOO_OLD: '新しい認証メールを待っています…',
    BACKGROUND_ERROR: '認証番号を取得できませんでした。'
  };

  function textOf(element) {
    return [
      element.getAttribute('name'),
      element.id,
      element.getAttribute('placeholder'),
      element.getAttribute('autocomplete'),
      element.getAttribute('aria-label'),
      element.closest('label') && element.closest('label').textContent
    ].filter(Boolean).join(' ');
  }

  function findOtpInput() {
    const candidates = Array.from(document.querySelectorAll('input:not([type="password"])'));
    let best = null;
    let bestScore = 0;

    candidates.forEach(function (input) {
      if (input.disabled || input.readOnly || input.type === 'hidden') return;
      const hint = textOf(input);
      const maxLength = Number(input.maxLength);
      let score = 0;

      if (input.autocomplete === 'one-time-code') score += 10;
      if (INPUT_HINT_RE.test(hint)) score += 5;
      if (input.type === 'tel' || input.type === 'number') score += 2;
      if (maxLength === 6) score += 4;
      else if (maxLength > 0 && maxLength <= 8) score += 1;
      if (input.value && /^\d{6}$/.test(input.value)) score += 2;

      if (score > bestScore) {
        best = input;
        bestScore = score;
      }
    });

    return best;
  }

  function getUi() {
    return document.getElementById(UI_ID);
  }

  function createUi() {
    let ui = getUi();
    if (ui) return ui;

    ui = document.createElement('section');
    ui.id = UI_ID;
    ui.className = 'agu-auth-helper-suggestion';
    ui.setAttribute('role', 'status');
    ui.setAttribute('aria-live', 'polite');
    ui.innerHTML = [
      '<div class="agu-auth-helper-status"></div>',
      '<button type="button" class="agu-auth-helper-code" hidden></button>',
      '<button type="button" class="agu-auth-helper-refresh">再取得</button>'
    ].join('');

    ui.querySelector('.agu-auth-helper-code').addEventListener('click', function () {
      if (!currentInput || !currentCode) return;
      setInputValue(currentInput, currentCode);
      currentCode = null;
      ui.querySelector('.agu-auth-helper-code').hidden = true;
      setStatus(ui, '認証番号を入力しました。ログインはご自身で押してください。');
    });

    ui.querySelector('.agu-auth-helper-refresh').addEventListener('click', function () {
      startPolling(true);
    });

    document.documentElement.appendChild(ui);
    return ui;
  }

  function positionUi(input) {
    if (!input || !input.isConnected) return;
    const ui = createUi();

    // Keep the helper away from the login form so the site's buttons remain
    // accessible. The stylesheet provides the same fallback position before
    // this function runs.
    ui.style.left = 'auto';
    ui.style.top = 'auto';
    ui.style.right = '20px';
    ui.style.bottom = '20px';
  }

  function setStatus(ui, text) {
    const status = ui.querySelector('.agu-auth-helper-status');
    if (status) status.textContent = text;
  }

  function renderCode(code) {
    const ui = createUi();
    const button = ui.querySelector('.agu-auth-helper-code');
    currentCode = code;
    button.textContent = code + ' を入力';
    button.hidden = false;
    setStatus(ui, '認証番号が見つかりました。クリックして入力できます。');
  }

  function renderError(message) {
    const ui = createUi();
    currentCode = null;
    ui.querySelector('.agu-auth-helper-code').hidden = true;
    setStatus(ui, message || '認証番号を取得できませんでした。');
  }

  function resetUi() {
    const ui = getUi();
    currentCode = null;
    if (!ui) return;
    ui.querySelector('.agu-auth-helper-code').hidden = true;
    setStatus(ui, '認証メールを確認しています…');
  }

  function setInputValue(input, value) {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value') ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function requestOtp() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'GET_LATEST_AGU_OTP' }, function (response) {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, status: 'BACKGROUND_ERROR' });
          return;
        }
        resolve(response || { ok: false, status: 'BACKGROUND_ERROR' });
      });
    });
  }

  async function pollOnce() {
    const response = await requestOtp();
    if (response.ok && response.code) {
      clearTimeout(pollTimer);
      pollTimer = null;
      renderCode(response.code);
      return true;
    }

    renderError(response.error || STATUS_MESSAGES[response.status] || STATUS_MESSAGES.BACKGROUND_ERROR);
    return false;
  }

  function scheduleNextPoll() {
    if (Date.now() - pollStartedAt >= POLL_TIMEOUT_MS) {
      renderError('認証番号が見つかりませんでした。再取得できます。');
      return;
    }

    clearTimeout(pollTimer);
    pollTimer = setTimeout(async function () {
      if (await pollOnce()) return;
      scheduleNextPoll();
    }, POLL_INTERVAL_MS);
  }

  async function startPolling(force) {
    const input = findOtpInput();
    if (!input) return;
    currentInput = input;
    positionUi(input);

    if (!force && pollTimer) return;
    clearTimeout(pollTimer);
    pollTimer = null;
    pollStartedAt = Date.now();
    createUi();
    resetUi();

    if (await pollOnce()) return;
    scheduleNextPoll();
  }

  function inspectPage() {
    if (currentInput && !currentInput.isConnected) {
      clearTimeout(pollTimer);
      pollTimer = null;
      currentInput = null;
      const ui = getUi();
      if (ui) ui.remove();
    }

    const input = findOtpInput();
    if (!input) return;
    if (input !== currentInput) {
      currentInput = input;
      positionUi(input);
      startPolling(false);
    }
  }

  const observer = new MutationObserver(function () {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(inspectPage, 250);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('scroll', function () {
    positionUi(currentInput);
  }, true);
  window.addEventListener('resize', function () {
    positionUi(currentInput);
  });
  window.addEventListener('pagehide', function () {
    clearTimeout(pollTimer);
    pollTimer = null;
    observer.disconnect();
  }, { once: true });
  inspectPage();
})();
