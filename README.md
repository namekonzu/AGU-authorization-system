# AGU Authorization Helper

青山学院のログイン時に送信される認証番号メールを、Gmail APIから取得して
`https://agsso.aoyamagakuin.jp/*` の認証番号入力欄へ候補表示する Chrome 拡張です。

この拡張は認証を代行するものではありません。認証番号の入力候補を表示し、
ユーザーが候補をクリックしたときだけ入力欄へ設定します。ログイン / Login ボタンは
自動クリックしません。

## 主な動作

1. 青山学院のログイン画面で認証番号入力欄を検出します。
2. Content Script が Service Worker に `GET_LATEST_AGU_OTP` を送ります。
3. 初回接続済みのGoogleアカウントから、Gmail APIで次の条件のメールを最大10件検索します。
   - Gmail query: `from:agsso-noreply@aoyamagakuin.jp newer_than:1d`
   - 送信元ヘッダーのメールアドレス: `agsso-noreply@aoyamagakuin.jp`
   - 受信時刻: 現在時刻から10分以内
4. `text/plain` を優先し、存在しない場合だけ `text/html` を解析します。multipartは再帰的に処理します。
5. 本文に `青山学院` と `認証番号` があり、`認証番号は 637237 です。` に相当する6桁の数字だけを採用します。
6. 候補ボタンをクリックすると、認証番号を入力欄へ設定します。

認証番号がまだ届いていない場合は3秒間隔で再確認します。最大60秒で自動確認を止め、
画面の「再取得」ボタンから再開できます。

Service WorkerとContent Scriptのレスポンスには状態を付けます。

| 状態 | 意味 |
| --- | --- |
| `OTP_FOUND` | 条件を満たす最新の認証番号を取得済み |
| `WAITING_FOR_EMAIL` | まだ対象メールが見つからない |
| `AUTH_REQUIRED` | PopupからGoogleアカウント接続が必要 |
| `GMAIL_API_ERROR` | Gmail APIへのアクセスに失敗 |
| `OTP_NOT_FOUND` | 対象メールはあるが本文からOTPを抽出できない |
| `OTP_TOO_OLD` | 対象メールが10分より古い |
| `BACKGROUND_ERROR` | その他のService Workerエラー |

## ファイル構成

```text
AGU-authorization-system/
├─ manifest.json
├─ background/
│  ├─ service-worker.js   # メッセージ処理、OAuth、UI向けの結果整形
│  ├─ gmail.js             # Gmail API検索とメール選択
│  └─ email-parser.js      # base64url、multipart、HTML、OTP解析
├─ content/
│  ├─ content.js           # 対象画面の入力欄検出と候補UI
│  └─ suggestion.css       # agu-auth-helper- 接頭辞のUIスタイル
├─ popup/
│  ├─ popup.html
│  ├─ popup.js              # Googleアカウント接続・解除
│  └─ popup.css
├─ icons/
├─ tests/
│  ├─ fixtures/            # Gmail APIの匿名化fixture
│  ├─ email-parser.test.js
│  ├─ gmail.test.js
│  └─ service-worker.test.js
└─ package.json
```

## Google Cloud の準備

### 1. プロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) を開きます。
2. 新しいプロジェクトを作成し、対象プロジェクトを選択します。
3. APIとサービスから **Gmail API** を有効にします。

### 2. OAuth同意画面を設定

1. **Google Auth Platform** または **APIとサービス > OAuth同意画面** を開きます。
2. 外部ユーザー型の場合は、テストユーザーに利用するGoogleアカウントを追加します。
3. アプリ名、サポートメール、デベロッパー連絡先を設定します。
4. スコープには次を追加します。

   ```text
   https://www.googleapis.com/auth/gmail.readonly
   ```

この拡張はメールの読み取りだけを行います。送信、削除、変更の権限は要求しません。

### 3. Chrome Extension用OAuthクライアントを作成

1. **認証情報 > 認証情報を作成 > OAuthクライアントID** を選択します。
2. アプリケーションの種類で **Chrome Extension** を選択します。
3. 拡張機能のIDを入力して作成します。

拡張機能のIDは、先に一度このリポジトリをChromeへ読み込むと
`chrome://extensions` で確認できます。拡張機能をパッケージ化する場合も、同じIDになるよう
公開鍵を管理してください。

## OAuth Client IDの設定

`manifest.json` には既存のGoogle OAuth Client IDを設定済みです。既存のChrome Extension
Item IDと紐づいた値を、プレースホルダーへ戻したり別の値へ変更したりしないでください。
新しい環境へ複製する場合だけ、Google Cloudで作成したOAuth Client IDを設定します。

```json
"client_id": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
```

実際のClient IDは個人のGoogleアカウント情報と一緒にGitへコミットしないでください。
Client ID自体は秘密鍵ではありませんが、利用環境を限定するため、公開リポジトリでは
プレースホルダーのままにし、ローカルで置き換える運用を推奨します。

## Chromeへ読み込む

1. `manifest.json` の Client ID を設定します。
2. Chromeで `chrome://extensions` を開きます。
3. 右上の **デベロッパーモード** を有効にします。
4. **パッケージ化されていない拡張機能を読み込む** をクリックします。
5. このリポジトリのルートディレクトリを選択します。
6. 拡張機能の詳細でIDを確認し、Google CloudのChrome Extension用OAuthクライアントの
   拡張機能IDと一致していることを確認します。

`background/service-worker.js` のエラーが表示されていないことを確認してください。
ファイルを変更した後は、`chrome://extensions` の拡張機能カードにある更新ボタンを押します。

## 初回接続と利用方法

1. Chromeツールバーの拡張機能メニューから **AGU Authorization Helper** を開きます。
2. Popupの **Googleアカウントと接続** を、ユーザーの操作で一度だけ押します。
3. Googleの同意画面でGmail読み取り権限を確認して許可します。
4. `https://agsso.aoyamagakuin.jp/ag` を開き、青山学院のIDとPasswordを通常どおり入力します。
5. 認証番号入力画面が表示されると、右下に認証番号の候補が表示されます。
6. 候補をクリックして入力欄へ設定し、ログインボタンは自分で押します。

Googleアカウントの切断はPopupの **接続を解除** から行えます。
青山学院のID、Password、メール本文、認証番号、OAuthアクセストークンを
`chrome.storage` や独自サーバーへ保存する処理はありません。

## テスト

Node.js 18以上でメール本文、Gmail API選択、Service Worker応答のテストを実行できます。

```bash
npm test
```

テストは実際の認証メールを使わず、`tests/fixtures/` の匿名化fixtureで次を検証します。

- plain text / HTML / multipart本文
- base64urlデコードとHTML entity
- 改行や空白、全角コロン
- `認証番号` ラベルのない数字の拒否
- 5桁、7桁、他の数字に埋め込まれた6桁の拒否
- 正確な送信元アドレス、送信元表示名付きFromヘッダー
- `from:agsso-noreply@aoyamagakuin.jp newer_than:1d` と `maxResults=10`
- 最新メール選択、10分超過メールの除外
- `OTP_FOUND`、`WAITING_FOR_EMAIL`、`OTP_TOO_OLD`、`AUTH_REQUIRED` の応答

## セキュリティと権限

- Content Scriptの対象は `https://agsso.aoyamagakuin.jp/*` のみです。
- `<all_urls>` や `https://*/*` は使用していません。
- Gmail APIのHost permissionは `https://gmail.googleapis.com/*` のみです。
- 権限は `identity` と `storage` だけです。
- `storage` には接続済み状態の真偽値だけを保存します。
- OAuthの初回インタラクティブ認証はPopupの接続ボタンからだけ開始します。
- 通常の認証番号取得では `interactive: false` を使います。
- APIの401時はキャッシュトークンを破棄して1回だけ再試行します。
- 無制限のポーリング、`eval()`、外部サーバーへのメール転送、consoleへの機密情報出力はありません。
- Content Scriptはログインボタンを自動クリックしません。

## 制約

この環境からは、実際のGoogleアカウント、Gmail受信箱、青山学院の認証画面を使った
ライブOAuth・E2E確認はできません。Chromeへの読み込み後、利用者のGoogle Cloud設定と
テストアカウントで接続および認証メール受信を確認してください。
