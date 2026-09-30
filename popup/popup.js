(function () {
  'use strict';

  const status = document.getElementById('agu-auth-helper-account-status');
  const message = document.getElementById('agu-auth-helper-message');
  const connectButton = document.getElementById('agu-auth-helper-connect');
  const disconnectButton = document.getElementById('agu-auth-helper-disconnect');

  function setMessage(text) {
    message.textContent = text || '';
  }

  function renderConnection(connected) {
    status.textContent = connected ? 'Connected' : 'Not connected';
    connectButton.hidden = connected;
    disconnectButton.hidden = !connected;
  }

  function send(type) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type }, function (response) {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: '拡張機能との通信に失敗しました。' });
          return;
        }
        resolve(response || { ok: false, error: '処理に失敗しました。' });
      });
    });
  }

  connectButton.addEventListener('click', async function () {
    connectButton.disabled = true;
    setMessage('Googleアカウント接続画面を準備しています…');
    const response = await send('CONNECT_GOOGLE_ACCOUNT');
    connectButton.disabled = false;

    if (response.ok) {
      renderConnection(true);
      setMessage('接続しました。');
    } else {
      setMessage(response.error);
    }
  });

  disconnectButton.addEventListener('click', async function () {
    disconnectButton.disabled = true;
    const response = await send('DISCONNECT_GOOGLE_ACCOUNT');
    disconnectButton.disabled = false;

    if (response.ok) {
      renderConnection(false);
      setMessage('接続を解除しました。');
    } else {
      setMessage(response.error);
    }
  });

  send('GET_CONNECTION_STATUS').then(function (response) {
    renderConnection(Boolean(response.ok && response.connected));
  });
})();
