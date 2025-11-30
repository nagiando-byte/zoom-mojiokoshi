# Zoom議事録自動生成システム

Zoomクラウドレコーディングの文字起こしから会議種類を自動判断し、構造化された議事録・評価・アクションアイテムを生成するWebアプリケーション。

## 概要

本システムは、Zoom会議の録画完了時に自動的にWebhookを受信し、文字起こしデータを取得してAIで分析することで、会議の種類に応じた最適な議事録を自動生成します。採用面接では候補者評価とLINEメッセージを、取引先との打ち合わせではフォローアップメール案を、社内会議ではアクションアイテムを自動抽出します。

## 主要機能

### 自動処理フロー

システムは以下の流れで完全自動処理を行います:

1. **Zoom録画完了** → Webhook自動受信(`recording.completed`イベント)
2. **文字起こし取得** → VTT形式の自動ダウンロードとパース
3. **AI分析** → 会議種類の自動判定(7種類対応)
4. **議事録生成** → 会議タイプに応じた構造化された議事録を作成
5. **アクションアイテム抽出** → 担当者・期限・優先度付きで自動抽出

### 対応する会議種類

#### 1. 採用面接 (interview)
- **面接ステージ自動判定**: 一次面接、二次面接、最終面接、その他
- **候補者評価**: 技術力、コミュニケーション能力、モチベーション、カルチャーフィット、総合評価
- **推薦度と理由**: 採用判断の参考情報
- **LINEメッセージ自動生成**: 候補者へ送信する丁寧で前向きなメッセージ

#### 2. 取引先との打ち合わせ (client_meeting)
- **取引先情報**: 会社名、参加者リスト
- **議論ポイント**: 話し合われた主要トピック
- **合意事項**: 決定された内容
- **次のステップ**: 今後のアクション
- **フォローアップメール案**: 取引先へ送信するビジネスメール(自動生成)

#### 3. 社内会議 (internal_meeting)
- **会議要約**: 全体のサマリー
- **主要ポイント**: 議論された重要事項
- **決定事項**: 確定した内容
- **アクションアイテム**: 担当者・期限・優先度付き

#### 4. その他の会議タイプ
- **1on1ミーティング** (one_on_one)
- **研修・トレーニング** (training)
- **プレゼン・説明会** (presentation)
- **その他** (other)

各タイプに対して汎用的な議事録フォーマットで対応します。

### AI自動判定

文字起こしテキストから以下を自動判定:
- **会議種類**: 7種類の中から最適なタイプを選択
- **会議サブタイプ**: より具体的な分類(例: "定例会議", "商談", "進捗確認", "キックオフ", "振り返り")
- **判定信頼度**: 0-100%のスコア
- **判断理由**: AIの判定根拠

### プロンプトカスタマイズ

ユーザーが独自のプロンプトテンプレートを作成・保存できます:
- **プロンプトタイプ**: 採用面接(一次/二次)、社内会議、取引先、カスタム
- **システムプロンプト**: AIの振る舞いを定義
- **ユーザープロンプトテンプレート**: 入力データの整形方法
- **デフォルト設定**: よく使うプロンプトをデフォルトに指定可能

### 手動再処理

議事録の内容が期待と異なる場合、カスタムプロンプトを適用して再処理できます:
- 既存の議事録とアクションアイテムを削除
- 新しいプロンプトでAI処理を再実行
- 複数のプロンプトを試して最適な結果を選択可能

## 技術スタック

### フロントエンド
- **React 19** - 最新のUIライブラリ
- **TypeScript 5.9** - 型安全な開発環境
- **Tailwind CSS 4** - ユーティリティファーストCSS
- **tRPC 11** - エンドツーエンド型安全なAPI通信
- **TanStack Query** - サーバー状態管理
- **shadcn/ui + Radix UI** - アクセシブルなUIコンポーネント
- **Vite 7** - 高速ビルドツール

### バックエンド
- **Node.js 22** - 最新のランタイム
- **Express 4** - Webフレームワーク
- **tRPC 11** - 型安全なAPI層
- **Drizzle ORM 0.44** - 型安全なORM
- **MySQL/TiDB** - リレーショナルデータベース

### 外部API連携
- **Zoom API**
  - Server-to-Server OAuth認証
  - Webhook受信(`recording.completed`)
  - 録画ファイルダウンロード(24時間有効なトークン)
  - 文字起こし(VTT形式)取得
- **Manus LLM API**
  - 会議種類判定
  - 構造化された議事録生成
  - JSON Schema出力

詳細は [TECH_STACK.md](./TECH_STACK.md) を参照してください。

## データベース設計

### テーブル構成

#### users
ユーザー情報を管理します。Manus OAuthと連携し、ロールベースアクセス制御(admin/user)をサポートします。

#### meetings
Zoom会議の基本情報を保存します:
- Zoom識別子: `zoomMeetingId`, `zoomRecordingId`, `zoomUuid`
- 会議メタデータ: `topic`, `hostId`, `hostEmail`, `startTime`, `duration`
- 録画情報: `recordingUrl`, `downloadUrl`, `downloadToken`
- 処理状態: `status` (pending/processing/completed/failed)
- 会議分類: `meetingType` (7種類), `interviewStage`, `meetingSubType`

#### transcripts
文字起こしデータを保存します:
- `fullText`: プレーンテキスト形式
- `vttContent`: VTT形式(タイムスタンプ付き)
- `language`: 言語情報

#### minutes
生成された議事録を保存します:
- 共通フィールド: `summary`, `keyPoints`, `decisions`
- 採用面接専用: `candidateName`, `evaluationPoints`, `recommendation`
- メッセージ: `lineMessage` (採用面接/取引先で使用)
- カスタマイズ: `customPrompt`

#### actionItems
アクションアイテムを管理します:
- `description`: タスク内容
- `assignee`: 担当者
- `dueDate`: 期限
- `priority`: 優先度(low/medium/high)
- `status`: ステータス(pending/in_progress/completed/cancelled)

#### promptTemplates
カスタマイズ可能なプロンプトを保存します:
- `name`: プロンプト名
- `type`: タイプ(interview_first/interview_second/regular_meeting/custom)
- `systemPrompt`: システムプロンプト
- `userPromptTemplate`: ユーザープロンプトテンプレート
- `isDefault`: デフォルト設定

## セットアップ

### 前提条件
- Node.js 22以上
- pnpm
- MySQL/TiDB データベース
- Zoom Marketplace アプリ(Server-to-Server OAuth)

### 環境変数設定

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
OWNER_OPEN_ID=auto_configured
OWNER_NAME=auto_configured

# Manus LLM API(自動設定済み)
BUILT_IN_FORGE_API_URL=auto_configured
BUILT_IN_FORGE_API_KEY=auto_configured
VITE_FRONTEND_FORGE_API_KEY=auto_configured
VITE_FRONTEND_FORGE_API_URL=auto_configured
```

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/nagiando-byte/zoom-mojiokoshi.git
cd zoom-mojiokoshi

# 2. 依存関係のインストール
pnpm install

# 3. データベースマイグレーション
pnpm db:push

# 4. 開発サーバー起動
pnpm dev
```

開発サーバーは `http://localhost:3000` で起動します。

### 本番環境デプロイ

```bash
# ビルド
pnpm build

# 本番サーバー起動
pnpm start
```

## Zoom連携設定

### 1. Zoom Marketplaceでアプリを作成

1. [Zoom Marketplace](https://marketplace.zoom.us/) にアクセス
2. "Develop" → "Build App" → "Server-to-Server OAuth" を選択
3. アプリ情報を入力(アプリ名、説明など)

### 2. 必要なスコープを追加

"Scopes" タブで以下のスコープを有効化:
- `recording:read:admin` - 録画ファイルの読み取り
- `recording:write:admin` - 録画ファイルの管理
- `meeting:read:admin` - 会議情報の読み取り

### 3. Webhook設定

1. "Feature" → "Event Subscriptions" を有効化
2. Event notification endpoint URL: `https://your-domain.com/api/webhooks/zoom`
3. Webhook Secret Tokenを生成(後で環境変数に設定)
4. 以下のイベントを購読:
   - `recording.completed` - 録画完了時に通知

### 4. 認証情報を取得

"App Credentials" タブから以下を取得:
- **Account ID**
- **Client ID**
- **Client Secret**

これらを `.env` ファイルの対応する環境変数に設定してください。

### 5. Webhook署名検証

セキュリティのため、Webhookリクエストの署名を検証します。Zoom Webhook Secret Tokenを環境変数 `ZOOM_WEBHOOK_SECRET_TOKEN` に設定することで、自動的に検証が行われます。

## API仕様

### Webhook エンドポイント

#### POST /api/webhooks/zoom
Zoomからのイベント通知を受信します。

**リクエストヘッダー**:
- `x-zm-signature`: Zoom署名(HMAC SHA256)
- `x-zm-request-timestamp`: リクエストタイムスタンプ

**イベントタイプ**:
- `recording.completed`: 録画完了時

**処理フロー**:
1. 署名検証
2. 会議情報をDBに保存
3. 文字起こしダウンロード
4. AI処理(会議種類判定 → 議事録生成)
5. ステータス更新

### tRPC API

#### meetings.list
全会議の一覧を取得します。

**戻り値**: `Meeting[]`

#### meetings.getById
会議の詳細情報を取得します。

**入力**: `{ id: number }`

**戻り値**:
```typescript
{
  meeting: Meeting;
  transcript: Transcript | null;
  minutes: Minute | null;
  actionItems: ActionItem[];
}
```

#### meetings.reprocess
会議を再処理します(カスタムプロンプト適用可能)。

**入力**:
```typescript
{
  meetingId: number;
  customPromptId?: number;
}
```

**処理**:
1. ステータスを`processing`に更新
2. 既存の議事録とアクションアイテムを削除
3. AI処理を再実行

#### prompts.list
プロンプトテンプレート一覧を取得します。

**戻り値**: `PromptTemplate[]`

#### prompts.create
新しいプロンプトテンプレートを作成します。

**入力**:
```typescript
{
  name: string;
  type: 'interview_first' | 'interview_second' | 'regular_meeting' | 'custom';
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault?: boolean;
}
```

#### prompts.update
プロンプトテンプレートを更新します。

**入力**:
```typescript
{
  id: number;
  name?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  isDefault?: boolean;
}
```

#### prompts.delete
プロンプトテンプレートを削除します。

**入力**: `{ id: number }`

## プロジェクト構成

```
├── client/                      # フロントエンド
│   ├── src/
│   │   ├── pages/              # ページコンポーネント
│   │   │   ├── Home.tsx        # ホームページ
│   │   │   ├── Meetings.tsx   # 会議一覧(未実装)
│   │   │   └── NotFound.tsx    # 404ページ
│   │   ├── components/         # 再利用可能なコンポーネント
│   │   │   ├── ui/            # shadcn/uiコンポーネント
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── contexts/          # Reactコンテキスト
│   │   ├── hooks/             # カスタムフック
│   │   ├── lib/
│   │   │   └── trpc.ts        # tRPCクライアント
│   │   ├── App.tsx            # ルーティング
│   │   ├── main.tsx           # エントリーポイント
│   │   └── index.css          # グローバルスタイル
│   └── public/                # 静的ファイル
├── server/                     # バックエンド
│   ├── _core/                 # コア機能
│   │   ├── zoomAuth.ts       # Zoom OAuth認証
│   │   ├── zoomWebhook.ts    # Webhook検証
│   │   ├── llm.ts            # LLM統合
│   │   ├── context.ts        # tRPCコンテキスト
│   │   ├── trpc.ts           # tRPC設定
│   │   └── index.ts          # サーバーエントリーポイント
│   ├── aiService.ts           # AI処理ロジック
│   ├── zoomService.ts         # Zoom API連携
│   ├── webhookHandler.ts      # Webhookハンドラー
│   ├── webhookRoutes.ts       # Webhookルート
│   ├── routers.ts             # tRPCルーター
│   └── db.ts                  # データベースヘルパー
├── drizzle/                   # データベース
│   ├── schema.ts              # スキーマ定義
│   └── meta/                  # マイグレーションメタデータ
├── shared/                    # 共有コード
│   └── const.ts               # 定数
├── workflow.puml              # システムワークフロー図(PlantUML)
├── workflow.png               # ワークフロー図(PNG)
├── TECH_STACK.md              # 技術スタック詳細
├── todo.md                    # 開発進捗管理
├── README.md                  # このファイル
├── package.json               # 依存関係
├── drizzle.config.ts          # Drizzle設定
├── tsconfig.json              # TypeScript設定
└── vite.config.ts             # Vite設定
```

## 開発状況

### 完了済み機能
- ✅ Zoom Webhook受信機能
- ✅ Zoom OAuth認証(Server-to-Server)
- ✅ 録画・文字起こし自動取得
- ✅ AI会議種類判定(7種類対応)
- ✅ 採用面接用議事録生成
- ✅ 取引先打ち合わせ用議事録生成(フォローアップメール付き)
- ✅ 社内会議用議事録生成
- ✅ 汎用議事録生成
- ✅ プロンプトカスタマイズ機能
- ✅ 手動再処理機能
- ✅ tRPC API実装
- ✅ データベーススキーマ設計
- ✅ 技術スタックドキュメント
- ✅ システムワークフロー図

### 未実装機能
- ⏳ フロントエンドUI
  - 会議一覧ページ
  - 会議詳細ページ
  - 議事録表示UI
  - プロンプト編集UI
  - ダッシュボード
- ⏳ テストコード
  - ユニットテスト
  - 統合テスト
  - E2Eテスト
- ⏳ 通知機能
  - メール通知
  - Slack通知
- ⏳ レポート機能
  - 月次サマリー
  - 会議統計

## トラブルシューティング

### Webhook が受信されない

1. Zoom Marketplaceで Webhook URL が正しく設定されているか確認
2. サーバーが公開URLでアクセス可能か確認
3. Webhook Secret Token が環境変数に正しく設定されているか確認
4. サーバーログで署名検証エラーがないか確認

### 文字起こしが取得できない

1. Zoom会議でクラウドレコーディングが有効になっているか確認
2. 録画設定で「音声文字起こし」が有効になっているか確認
3. download_tokenの有効期限(24時間)が切れていないか確認

### AI処理が失敗する

1. Manus LLM APIの認証情報が正しく設定されているか確認
2. 文字起こしテキストが空でないか確認
3. サーバーログでエラーメッセージを確認
4. カスタムプロンプトが正しいJSON Schemaを返すか確認

### データベース接続エラー

1. `DATABASE_URL` が正しく設定されているか確認
2. データベースサーバーが起動しているか確認
3. マイグレーションが実行されているか確認(`pnpm db:push`)

## ライセンス

MIT License

## 作成者

Manus AI Agent

## リポジトリ

https://github.com/nagiando-byte/zoom-mojiokoshi
