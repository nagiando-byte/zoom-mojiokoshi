# セットアップガイド

本ドキュメントは、Zoom議事録自動生成システムの詳細なセットアップ手順を記載します。

## 目次

1. [前提条件](#前提条件)
2. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
3. [Zoom Marketplace設定](#zoom-marketplace設定)
4. [データベースセットアップ](#データベースセットアップ)
5. [環境変数設定](#環境変数設定)
6. [動作確認](#動作確認)
7. [本番環境デプロイ](#本番環境デプロイ)
8. [トラブルシューティング](#トラブルシューティング)

## 前提条件

### 必須ソフトウェア

- **Node.js**: 22.0.0以上
- **pnpm**: 10.0.0以上
- **Git**: 2.0以上
- **MySQL**: 8.0以上 または **TiDB**

### 必須アカウント

- **Zoom**: Pro以上のプラン(クラウドレコーディング機能が必要)
- **Zoom Marketplace**: 開発者アカウント
- **Manus**: アカウント(OAuth認証用)

### 推奨環境

- **OS**: macOS, Linux, Windows(WSL2)
- **エディタ**: VS Code + TypeScript拡張機能
- **ターミナル**: bash, zsh, または同等のシェル

## ローカル開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/nagiando-byte/zoom-mojiokoshi.git
cd zoom-mojiokoshi
```

### 2. Node.jsバージョン確認

```bash
node --version
# v22.0.0以上であることを確認
```

Node.jsが古い場合は、[nvm](https://github.com/nvm-sh/nvm)を使用してアップデートしてください:

```bash
nvm install 22
nvm use 22
```

### 3. pnpmのインストール

```bash
npm install -g pnpm
pnpm --version
# 10.0.0以上であることを確認
```

### 4. 依存関係のインストール

```bash
pnpm install
```

このコマンドは以下をインストールします:
- フロントエンド依存関係(React, Tailwind CSS, tRPC)
- バックエンド依存関係(Express, Drizzle ORM)
- 開発ツール(TypeScript, Vite, Vitest)

## Zoom Marketplace設定

### 1. Zoom Marketplaceにアクセス

1. [Zoom Marketplace](https://marketplace.zoom.us/)にアクセス
2. 右上の「Sign In」からZoomアカウントでログイン
3. 「Develop」→「Build App」をクリック

### 2. Server-to-Server OAuthアプリを作成

1. 「Server-to-Server OAuth」を選択
2. 「Create」をクリック
3. アプリ情報を入力:
   - **App Name**: `Zoom議事録自動生成` (任意)
   - **Short Description**: `Zoom会議の議事録を自動生成するシステム`
   - **Company Name**: あなたの会社名
   - **Developer Contact Information**: あなたのメールアドレス

4. 「Continue」をクリック

### 3. スコープを設定

「Scopes」タブで以下のスコープを追加:

- `recording:read:admin` - 録画ファイルの読み取り
- `recording:write:admin` - 録画ファイルの管理
- `meeting:read:admin` - 会議情報の読み取り

「Continue」をクリック

### 4. 認証情報を取得

「App Credentials」タブで以下の情報をコピー:

- **Account ID**
- **Client ID**
- **Client Secret**

これらを後で`.env`ファイルに設定します。

### 5. Webhook設定

1. 「Feature」タブをクリック
2. 「Event Subscriptions」を有効化
3. 「Add Event Subscription」をクリック
4. 以下を設定:
   - **Subscription Name**: `Recording Completed`
   - **Event notification endpoint URL**: `https://your-domain.com/api/webhooks/zoom`
     - ローカル開発の場合は[ngrok](https://ngrok.com/)を使用してください
   - **Event types**: `Recording` → `Recording completed`を選択

5. 「Save」をクリック
6. **Webhook Secret Token**が生成されるのでコピー(後で`.env`に設定)

### 6. アプリをアクティベート

1. 「Activation」タブをクリック
2. 「Activate your app」をクリック
3. アプリがアクティブになったことを確認

## データベースセットアップ

### MySQL/TiDBの準備

#### オプション1: ローカルMySQLを使用

```bash
# macOS (Homebrew)
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt-get install mysql-server
sudo systemctl start mysql

# データベースを作成
mysql -u root -p
CREATE DATABASE zoom_minutes;
CREATE USER 'zoom_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON zoom_minutes.* TO 'zoom_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### オプション2: TiDB Cloudを使用(推奨)

1. [TiDB Cloud](https://tidbcloud.com/)にアクセス
2. 無料アカウントを作成
3. 新しいクラスターを作成
4. 接続情報をコピー(後で`.env`に設定)

### マイグレーション実行

```bash
pnpm db:push
```

このコマンドは以下を実行します:
1. `drizzle-kit generate` - マイグレーションファイルを生成
2. `drizzle-kit migrate` - マイグレーションを実行

成功すると、以下のテーブルが作成されます:
- `users`
- `meetings`
- `transcripts`
- `minutes`
- `actionItems`
- `promptTemplates`

## 環境変数設定

### .envファイルを作成

プロジェクトルートに`.env`ファイルを作成します:

```bash
touch .env
```

### 環境変数を設定

`.env`ファイルに以下を記載:

```bash
# ============================================
# データベース設定
# ============================================
DATABASE_URL=mysql://zoom_user:your_password@localhost:3306/zoom_minutes

# TiDB Cloudの場合:
# DATABASE_URL=mysql://user:password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/zoom_minutes?ssl={"rejectUnauthorized":true}

# ============================================
# Zoom API設定
# ============================================
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret_token

# ============================================
# Manus設定(自動設定済み - 変更不要)
# ============================================
# これらの環境変数はManusプラットフォームで自動設定されます
# ローカル開発では手動設定が必要な場合があります

# JWT_SECRET=your_jwt_secret
# OAUTH_SERVER_URL=https://api.manus.im
# VITE_OAUTH_PORTAL_URL=https://portal.manus.im
# OWNER_OPEN_ID=your_open_id
# OWNER_NAME=your_name

# ============================================
# Manus LLM API設定(自動設定済み - 変更不要)
# ============================================
# BUILT_IN_FORGE_API_URL=https://forge.manus.im
# BUILT_IN_FORGE_API_KEY=your_api_key
# VITE_FRONTEND_FORGE_API_KEY=your_frontend_api_key
# VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
```

### 環境変数の説明

#### DATABASE_URL
MySQLまたはTiDBの接続文字列です。形式:
```
mysql://ユーザー名:パスワード@ホスト:ポート/データベース名
```

#### ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
Zoom Marketplaceの「App Credentials」タブから取得した認証情報です。

#### ZOOM_WEBHOOK_SECRET_TOKEN
Zoom Marketplaceの「Event Subscriptions」で生成されたシークレットトークンです。Webhook署名検証に使用されます。

## 動作確認

### 1. 開発サーバーを起動

```bash
pnpm dev
```

以下のメッセージが表示されれば成功です:
```
Server running on http://localhost:3000/
```

### 2. ブラウザでアクセス

ブラウザで `http://localhost:3000` にアクセスします。

### 3. Webhook URLを公開(ローカル開発の場合)

ローカル開発環境でZoom Webhookを受信するには、[ngrok](https://ngrok.com/)を使用します:

```bash
# ngrokをインストール
brew install ngrok  # macOS
# または https://ngrok.com/download からダウンロード

# ポート3000を公開
ngrok http 3000
```

ngrokが表示する`https://xxxx.ngrok.io`のURLをコピーし、Zoom Marketplaceの「Event notification endpoint URL」に設定:
```
https://xxxx.ngrok.io/api/webhooks/zoom
```

### 4. Zoom会議で動作確認

1. Zoomでクラウドレコーディングを有効にして会議を開催
2. 会議を録画
3. 会議を終了
4. 数分後、Webhookが受信され、議事録が自動生成される

サーバーログで以下を確認:
```
[Webhook] Received recording.completed event
[Zoom Service] Downloading transcript...
[AI Service] Classifying meeting type...
[AI Service] Generating minutes...
[Webhook] Processing completed successfully
```

### 5. データベースを確認

```bash
# MySQLに接続
mysql -u zoom_user -p zoom_minutes

# 会議データを確認
SELECT * FROM meetings;

# 議事録を確認
SELECT * FROM minutes;
```

## 本番環境デプロイ

### 1. ビルド

```bash
pnpm build
```

このコマンドは以下を実行します:
- フロントエンドのビルド(`vite build`)
- バックエンドのビルド(`esbuild`)

ビルド成果物は`dist/`ディレクトリに出力されます。

### 2. 本番サーバー起動

```bash
NODE_ENV=production pnpm start
```

### 3. プロセスマネージャー(PM2)を使用

本番環境では、PM2を使用してプロセスを管理することを推奨します:

```bash
# PM2をインストール
npm install -g pm2

# アプリを起動
pm2 start dist/index.js --name zoom-minutes

# 自動起動設定
pm2 startup
pm2 save

# ログを確認
pm2 logs zoom-minutes
```

### 4. リバースプロキシ(Nginx)設定

Nginxを使用してリバースプロキシを設定します:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL証明書(Let's Encrypt)

```bash
# Certbotをインストール
sudo apt-get install certbot python3-certbot-nginx

# SSL証明書を取得
sudo certbot --nginx -d your-domain.com

# 自動更新設定
sudo certbot renew --dry-run
```

### 6. Zoom Webhook URLを更新

Zoom Marketplaceの「Event notification endpoint URL」を本番URLに更新:
```
https://your-domain.com/api/webhooks/zoom
```

## トラブルシューティング

### Webhook が受信されない

**症状**: Zoom会議を録画しても、Webhookが受信されない

**原因と解決策**:

1. **Webhook URLが間違っている**
   - Zoom Marketplaceで設定したURLを確認
   - `https://your-domain.com/api/webhooks/zoom`が正しいか確認

2. **サーバーが公開されていない**
   - ローカル開発の場合: ngrokが起動しているか確認
   - 本番環境: ファイアウォールでポート80/443が開いているか確認

3. **署名検証エラー**
   - `ZOOM_WEBHOOK_SECRET_TOKEN`が正しく設定されているか確認
   - サーバーログで`Invalid signature`エラーがないか確認

4. **Zoom Marketplaceでイベントが有効になっていない**
   - 「Event Subscriptions」で`Recording completed`が選択されているか確認

### 文字起こしが取得できない

**症状**: 会議は保存されるが、文字起こしが空

**原因と解決策**:

1. **Zoom会議で文字起こしが有効になっていない**
   - Zoom設定 → 録画 → 「音声文字起こし」を有効化

2. **download_tokenの有効期限切れ**
   - download_tokenは24時間で期限切れ
   - Webhook受信後すぐに文字起こしをダウンロードする必要がある

3. **言語設定が間違っている**
   - Zoom設定で正しい言語(日本語/英語)が選択されているか確認

### AI処理が失敗する

**症状**: ステータスが`failed`になる

**原因と解決策**:

1. **Manus LLM APIの認証エラー**
   - `BUILT_IN_FORGE_API_KEY`が正しく設定されているか確認
   - サーバーログでAPI呼び出しエラーを確認

2. **文字起こしテキストが空**
   - `transcripts`テーブルで`fullText`が空でないか確認
   - 文字起こし取得処理が成功しているか確認

3. **JSON Schema出力エラー**
   - カスタムプロンプトが正しいJSON Schemaを返すか確認
   - サーバーログでパースエラーを確認

### データベース接続エラー

**症状**: `Error: Can't connect to database`

**原因と解決策**:

1. **DATABASE_URLが間違っている**
   - 接続文字列の形式を確認
   - ユーザー名、パスワード、ホスト、ポート、データベース名が正しいか確認

2. **データベースサーバーが起動していない**
   - MySQLサービスが起動しているか確認: `sudo systemctl status mysql`
   - TiDB Cloudの場合: クラスターが起動しているか確認

3. **マイグレーションが実行されていない**
   - `pnpm db:push`を実行
   - テーブルが作成されているか確認

### ポート3000が使用中

**症状**: `Error: listen EADDRINUSE: address already in use :::3000`

**解決策**:

```bash
# ポート3000を使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートを使用
PORT=3001 pnpm dev
```

### TypeScriptエラー

**症状**: `Type error: ...`

**解決策**:

```bash
# 型チェック
pnpm check

# node_modulesを再インストール
rm -rf node_modules
pnpm install

# TypeScriptキャッシュをクリア
rm -rf node_modules/.cache
```

## サポート

問題が解決しない場合は、以下をお試しください:

1. **GitHubでIssueを作成**: https://github.com/nagiando-byte/zoom-mojiokoshi/issues
2. **ログを確認**: サーバーログに詳細なエラーメッセージが記録されています
3. **ドキュメントを再確認**: README.md、API_SPECIFICATION.md、DEVELOPMENT_HISTORY.mdを参照

## 次のステップ

セットアップが完了したら、以下を試してみてください:

1. **カスタムプロンプトを作成**: 独自の議事録フォーマットを定義
2. **フロントエンドUIを実装**: 会議一覧、詳細表示ページを追加
3. **通知機能を追加**: Slack、メール通知を実装
4. **テストコードを追加**: ユニットテスト、統合テストを実装
