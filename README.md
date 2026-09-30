# AGU Authorization Helper

青山学院大学のポータル認証を少し楽にするためのChrome拡張機能です。

青山学院のログイン時にGmailへ届く6桁の認証番号を取得し、
認証番号入力画面に候補として表示します。

Gmailを毎回開いて認証番号を確認する手間を減らすことを目的としています。

> [!IMPORTANT]
> この拡張機能は青山学院大学公式のものではありません。
> 個人が開発している非公式Chrome拡張機能です。

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
クリック
↓
認証番号が入力される

という流れになります。
```
 ## 特徴

 Gmailから青山学院の認証メールを自動で確認

 最新の6桁認証番号を取り出す

 青山学院の認証番号入力欄に候補を表示

 Gmailを開く必要なし

 Mainfest V3に対応

 ## セキュリティ

 以下の情報は保存してません。

 青山学院のユーザーID

　青山学院のパスワード

　Gmailのメール本文

　認証番号

　OAuth Access Tokenの独自保存

 GmailへのアクセスにはGoogle公式のGmail APIを使用しています

 必要な権限は、https://www.googleapis.com/auth/gmail.readonly　です。

# install

## Github上での操作
このGitHubページ上部の『Code』をクリックします。

その後、『Download ZIP』をクリックしてください。

ダウンロードしたZIPファイルを解凍します。
## Chrome上での操作

Chromeの拡張機能画面を開いてください。URLは『chrome://extensions/』です。

画面右上にある、デベロッパーモードをONにしてください。

パッケージ化されていない拡張機能を読み込むをクリックしてください。

先ほどZIPを解凍したフォルダを選択してください。

AGU Authorization Helperを確認できれば成功です。

# 使用する前の設定

この拡張機能は、認証番号を取得するためにGmail APIを利用しています。

Chrome右上から

AGU Authorization Helper

を開き、

Googleアカウントと接続

をクリックしてください。

Googleの認証画面が表示されます。

【注意】「Google hasn't verified this app」と表示される場合

個人開発、テスト中のため、『Google hasn't verified this app』と表示される場合があります。





