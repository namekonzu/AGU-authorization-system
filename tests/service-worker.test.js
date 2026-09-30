const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');
const fixtureDir = path.join(__dirname, 'fixtures');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8'));
}

function createServiceWorker(options = {}) {
  let messageListener;
  const storage = { googleConnected: true };
  const fixtures = {
    list: readJson('gmail-list.json'),
    'old-message': readJson('message-old.json'),
    'older-message': readJson('message-older.json'),
    'latest-message': readJson('message-latest.json')
  };
  const runtime = { lastError: null };
  const fixedDate = class extends Date {};
  fixedDate.now = () => 1700000600000;

  const context = {
    TextDecoder,
    Uint8Array,
    atob,
    btoa,
    Date: fixedDate,
    clearTimeout,
    setTimeout,
    console,
    fetch: async function (url) {
      if (String(url).includes('/messages?')) {
        return { ok: true, json: async () => fixtures.list };
      }
      const id = String(url).match(/messages\/([^?]+)/)[1];
      return { ok: true, json: async () => fixtures[id] };
    },
    chrome: {
      runtime: {
        lastError: null,
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          }
        }
      },
      identity: {
        getAuthToken(_options, callback) {
          if (options.authError) {
            context.chrome.runtime.lastError = { message: options.authError };
            callback(undefined);
            context.chrome.runtime.lastError = null;
            return;
          }
          callback('test-token');
        },
        removeCachedAuthToken(_details, callback) {
          if (callback) callback();
        }
      },
      storage: {
        local: {
          async get() {
            return storage;
          },
          async set(values) {
            Object.assign(storage, values);
          },
          async remove(key) {
            delete storage[key];
          }
        }
      }
    }
  };

  vm.createContext(context);
  context.importScripts = function (...files) {
    files.forEach((file) => {
      const source = fs.readFileSync(path.join(rootDir, 'background', file), 'utf8');
      vm.runInContext(source, context, { filename: file });
    });
  };

  const serviceWorkerSource = fs.readFileSync(
    path.join(rootDir, 'background', 'service-worker.js'),
    'utf8'
  );
  vm.runInContext(serviceWorkerSource, context, { filename: 'service-worker.js' });

  return {
    send(message) {
      return new Promise((resolve) => {
        messageListener(message, {}, resolve);
      });
    }
  };
}

test('returns OTP_FOUND from the Service Worker with the unified response shape', async () => {
  const worker = createServiceWorker();
  const response = await worker.send({ type: 'GET_LATEST_AGU_OTP' });

  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: true,
    status: 'OTP_FOUND',
    code: '637237',
    receivedAt: 1700000540000
  });
});

test('returns AUTH_REQUIRED without opening an interactive OAuth screen', async () => {
  const worker = createServiceWorker({ authError: 'No cached token' });
  const response = await worker.send({ type: 'GET_LATEST_AGU_OTP' });
  assert.equal(response.ok, false);
  assert.equal(response.status, 'AUTH_REQUIRED');
});
