# Zoom議事録自動生成システム

Zoomクラウドレコーディングの文字起こしから会議種類を自動判断し、構造化された議事録・評価・アクションアイテムを生成するWebアプリケーション。

## 主要機能

### 🎯 自動処理フロー
1. **Zoom録画完了** → Webhook自動受信
2. **文字起こし取得** → VTT形式の自動ダウンロード
3. **AI分析** → 会議種類の自動判定(採用面接 or 通常会議)
4. **議事録生成** → 構造化された議事録を自動作成
5. **アクションアイテム抽出** → 担当者・期限・優先度付きで抽出

### 📋 採用面接用機能
- **面接ステージ判定**(一次/二次/最終)
- **候補者評価**
  - 技術力
  - コミュニケーション能力
  - モチベーション
  - カルチャーフィット
  - 総合評価
- **推薦度と理由**
- **候補者へのLINEメッセージ自動生成**

### 📊 通常会議用機能
- **会議要約**
- **主要な議論ポイント**
- **決定事項**
- **アクションアイテム**(担当者・期限・優先度付き)

### ⚙️ カスタマイズ機能
- **プロンプトテンプレート管理**
- **手動再処理**
- **カスタムプロンプト適用**

## 技術スタック

### フロントエンド
- React 19 + TypeScript
- Tailwind CSS 4
- tRPC + TanStack Query
- shadcn/ui + Radix UI

### バックエンド
- Node.js 22 + Express
- tRPC 11
- Drizzle ORM + MySQL/TiDB
- Zoom API (Server-to-Server OAuth)
- Manus LLM API

詳細は [TECH_STACK.md](./TECH_STACK.md) を参照してください。

## セットアップ

### 前提条件
- Node.js 22以上
- pnpm
- MySQL/TiDB データベース
- Zoom Marketplace アプリ(Server-to-Server OAuth)

### 環境変数

`.env` ファイルを作成し、以下の環境変数を設定してください:

```bash
# データベース
DATABASE_URL=mysql://user:password@host:port/database

# Zoom API
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret

# Manus認証(自動設定済み)
JWT_SECRET=auto_configured
OAUTH_SERVER_URL=auto_configured
VITE_OAUTH_PORTAL_URL=auto_configured

# Manus LLM API(自動設定済み)
BUILT_IN_FORGE_API_URL=auto_configured
BUILT_IN_FORGE_API_KEY=auto_configured
```

### インストール

```bash
# 依存関係のインストール
pnpm install

# データベースマイグレーション
pnpm db:push

# 開発サーバー起動
pnpm dev
```

### 本番環境

```bash
# ビルド
pnpm build

# 本番サーバー起動
pnpm start
```

## Zoom Webhook設定

### 1. Zoom Marketplaceでアプリを作成

1. [Zoom Marketplace](https://marketplace.zoom.us/) にアクセス
2. "Develop" → "Build App" → "Server-to-Server OAuth" を選択
3. アプリ情報を入力

### 2. 必要なスコープを追加

以下のスコープを有効化:
- `recording:read:admin`
- `recording:write:admin`
- `meeting:read:admin`

### 3. Webhook設定

1. "Feature" → "Event Subscriptions" を有効化
2. Event notification endpoint URL: `https://your-domain.com/api/webhooks/zoom`
3. 以下のイベントを購読:
   - `recording.completed`

### 4. 認証情報を取得

- Account ID
- Client ID
- Client Secret
- Webhook Secret Token

これらを `.env` ファイルに設定してください。

## プロジェクト構成

```
├── client/                 # フロントエンド
│   ├── src/
│   │   ├── pages/         # ページコンポーネント
│   │   ├── components/    # 再利用可能なコンポーネント
│   │   └── lib/           # ユーティリティ
│   └── public/            # 静的ファイル
├── server/                # バックエンド
│   ├── _core/             # コア機能
│   │   ├── zoomAuth.ts   # Zoom OAuth認証
│   │   ├── zoomWebhook.ts # Webhook検証
│   │   └── llm.ts        # LLM統合
│   ├── aiService.ts       # AI処理ロジック
│   ├── zoomService.ts     # Zoom API連携
│   ├── webhookHandler.ts  # Webhookハンドラー
│   ├── routers.ts         # tRPCルーター
│   └── db.ts              # データベースヘルパー
├── drizzle/               # データベーススキーマ
│   └── schema.ts
├── workflow.puml          # システムワークフロー図
├── TECH_STACK.md          # 技術スタック詳細
└── README.md
```

## API エンドポイント

### Webhook
- `POST /api/webhooks/zoom` - Zoom Webhook受信

### tRPC API
- `meetings.list` - 会議一覧取得
- `meetings.getById` - 会議詳細取得
- `meetings.reprocess` - 手動再処理
- `prompts.list` - プロンプトテンプレート一覧
- `prompts.create` - プロンプトテンプレート作成
- `prompts.update` - プロンプトテンプレート更新
- `prompts.delete` - プロンプトテンプレート削除

## 開発状況

### 完了済み
- ✅ Zoom Webhook受信機能
- ✅ Zoom OAuth認証(Server-to-Server)
- ✅ 録画・文字起こし自動取得
- ✅ AI会議種類判定
- ✅ 採用面接用議事録生成
- ✅ 通常会議用議事録生成
- ✅ プロンプトカスタマイズ機能
- ✅ tRPC API実装

### 未実装
- ⏳ フロントエンドUI
  - 会議一覧ページ
  - 会議詳細ページ
  - 議事録表示UI
  - プロンプト編集UI
- ⏳ テストコード
- ⏳ ドキュメント完成

## ライセンス

MIT License

## 作成者

Manus AI Agent
