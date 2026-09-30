# AGU Authorization Helper

青山学院大学のポータル認証を少し便利にするための、非公式Chrome拡張機能です。

青山学院のログイン時にGmailへ届く6桁の認証番号を取得し、認証番号入力画面に入力候補として表示します。毎回Gmailを開いて認証番号を確認する手間を減らすことを目的としています。

> [!IMPORTANT]
> この拡張機能は青山学院大学公式のものではありません。個人が開発している非公式Chrome拡張機能です。

---

## 動作イメージ

```text
青学ポータルへログイン
↓
認証メールがGmailへ届く
↓
拡張機能が認証番号を取得
↓
「123456 を入力」と表示
↓
候補をクリック
↓
認証番号が入力される
↓
ユーザー自身が認証ボタンを押す
```

## 特徴

- Gmailから青山学院の認証メールを確認
- 最新の6桁認証番号を取得
- 青山学院の認証番号入力欄に候補を表示
- 候補をクリックすると認証番号を入力
- Gmailを毎回開く必要なし
- Manifest V3対応
- 認証ボタンは自動で押さない設計

## セキュリティ・プライバシー

本拡張機能では、以下の情報を独自に永続保存しません。

- 青山学院のユーザーID
- 青山学院のパスワード
- Gmailのメール本文
- 認証番号
- OAuth Access Token

また、Gmailのメール本文や認証番号を、開発者が管理する外部サーバーへ送信しません。

GmailへのアクセスにはGoogle公式のGmail APIを使用しています。使用する権限は以下です。

```text
https://www.googleapis.com/auth/gmail.readonly
```

この権限は、青山学院から届く認証メールを読み取り、6桁の認証番号を取得するために使用します。

詳しくは、以下をご確認ください。

- [Privacy Policy](https://namekonzu.com/agu-auth-helper/privacy/)
- [Terms of Service](https://namekonzu.com/agu-auth-helper/terms/)

---

# インストール方法

現在はChrome Web Storeではなく、GitHubからZIPファイルをダウンロードしてインストールする方式です。

## 1. GitHubからダウンロード

このGitHubページ上部の **Code** をクリックし、**Download ZIP** を選択してください。

ダウンロードしたZIPファイルを任意の場所に解凍します。

> [!NOTE]
> インストール後も解凍したフォルダを使用するため、削除しないでください。

## 2. Chromeで拡張機能を読み込む

Chromeのアドレスバーに以下を入力します。

```text
chrome://extensions/
```

1. 右上の **デベロッパーモード** をONにする
2. **パッケージ化されていない拡張機能を読み込む** をクリック
3. ZIPを解凍したフォルダを選択
4. `AGU Authorization Helper` が表示されればインストール完了

`manifest.json` が入っているフォルダを選択してください。

---

# 使用前の設定

この拡張機能は、認証番号を取得するためにGmail APIを利用します。

1. Chrome右上の拡張機能メニューを開く
2. **AGU Authorization Helper** を開く
3. **Googleアカウントと接続** をクリック
4. 認証メールを受け取っているGoogleアカウントを選択
5. 表示されるアクセス権限を確認して許可

## 「Google hasn't verified this app」と表示される場合

本拡張機能のGoogle OAuth審査状況によっては、Googleから未確認アプリの警告が表示される場合があります。

表示された場合は、Googleが表示するアプリ名・要求権限を確認したうえで、ご自身の判断で続行してください。

> [!WARNING]
> Google側でアクセス自体が拒否される場合は、OAuthアプリの公開設定または利用者制限が原因の可能性があります。

---

# 使い方

拡張機能のセットアップ後は、通常通り青山学院のポータルへログインしてください。

認証番号入力画面になると、拡張機能がGmailを確認します。

認証メールが見つかると、以下のような候補が表示されます。

```text
123456 を入力
```

候補をクリックすると、認証番号入力欄へ番号が入力されます。

**最後の認証ボタンはユーザー自身で押してください。**

## 認証番号が表示されない場合

まず、Gmailに以下の送信元から認証メールが届いているか確認してください。

```text
agsso-noreply@aoyamagakuin.jp
```

メールが届いている場合は、拡張機能に表示される **再取得** を押してください。

それでも取得できない場合は、以下を試してください。

1. `chrome://extensions/` を開く
2. `AGU Authorization Helper` の再読み込みボタンを押す
3. 青山学院の認証画面を開き直す

問題が解決しない場合は、GitHub Issuesから報告してください。

> [!IMPORTANT]
> Issueへ認証番号、メール本文、青山学院のID・パスワードなどを貼り付けないでください。

---

# アップデート

GitHub版では自動更新されません。

新しいバージョンが公開された場合は、以下の手順で更新してください。

1. GitHubから最新版のZIPをダウンロード
2. ZIPを解凍
3. 現在使用している拡張機能フォルダを最新版に置き換える
4. `chrome://extensions/` を開く
5. `AGU Authorization Helper` の **再読み込み** を押す

---

# アンインストール

Chromeで以下を開きます。

```text
chrome://extensions/
```

`AGU Authorization Helper` の **削除** をクリックしてください。

Googleアカウントとの接続を解除したい場合は、拡張機能のPopupから接続解除を行ってください。

---

# 開発について

主に以下の技術を使用しています。

- Chrome Extension Manifest V3
- Chrome Identity API
- Gmail API
- JavaScript

## OAuth Client IDについて

Google OAuthのClient IDは、拡張機能がGoogle APIを利用するための**公開識別子**です。そのため、`manifest.json` にClient IDが含まれていても、それ自体はパスワードや秘密鍵ではありません。

一方で、以下のような秘密情報はリポジトリへ含めないでください。

- OAuth Client Secret
- Service Accountの秘密鍵
- `.pem` などの秘密鍵ファイル
- OAuth Access Token / Refresh Token

GitHubから配布する場合、利用者は同じOAuth Client ID / Google Cloud Projectを利用します。そのため、OAuthの公開状態・審査状態・APIクォータも同じGoogle Cloud Projectに紐づきます。

---

# Contributing

バグ報告・改善案・Pull Requestを歓迎します。

特に、以下の変更や不具合を発見した場合はIssueを作成してください。

- 青山学院側の認証画面変更
- 認証メール形式の変更
- Chromeアップデートによる不具合
- UI改善

機密情報や個人情報はIssueへ投稿しないでください。

---

# Disclaimer

AGU Authorization Helperは青山学院大学とは関係のない非公式プロジェクトです。

青山学院大学、Google、Chrome等の仕様変更により、正常に動作しなくなる場合があります。
