# Zoom議事録自動生成システム - 技術スタック

## システム概要

Zoomクラウドレコーディングの文字起こしから会議種類を自動判断し、構造化された議事録・評価・アクションアイテムを生成するWebアプリケーション。

---

## フロントエンド

### コアフレームワーク
- **React 19** - UIライブラリ
- **TypeScript 5.9** - 型安全な開発
- **Vite 7** - 高速ビルドツール
- **Wouter 3** - 軽量ルーティング

### スタイリング
- **Tailwind CSS 4** - ユーティリティファーストCSS
- **shadcn/ui** - 再利用可能なUIコンポーネント
- **Radix UI** - アクセシブルなプリミティブコンポーネント
- **Lucide React** - アイコンライブラリ

### 状態管理・データフェッチング
- **tRPC 11** - エンドツーエンド型安全なAPI
- **TanStack Query (React Query)** - サーバー状態管理
- **Superjson** - Date型などの自動シリアライズ

### ユーティリティ
- **date-fns** - 日付フォーマット
- **zod** - スキーマバリデーション
- **clsx / tailwind-merge** - クラス名管理

---

## バックエンド

### コアフレームワーク
- **Node.js 22** - ランタイム
- **Express 4** - Webフレームワーク
- **TypeScript 5.9** - 型安全な開発
- **tRPC 11** - API層

### データベース
- **MySQL/TiDB** - リレーショナルデータベース
- **Drizzle ORM 0.44** - 型安全なORM
- **Drizzle Kit** - マイグレーション管理

### 外部API連携
- **Zoom API** - 録画・文字起こし取得
  - Server-to-Server OAuth認証
  - Webhook受信(`recording.completed`)
  - 録画ファイルダウンロード
  - 文字起こし(VTT形式)取得

### AI処理
- **Manus LLM API** - 大規模言語モデル
  - 会議種類判定(採用面接 vs 通常会議)
  - 面接ステージ分類(一次/二次/最終)
  - 構造化された議事録生成
  - JSON Schema出力

### 認証
- **Manus OAuth** - ユーザー認証
- **JWT (jose)** - セッション管理
- **Cookie-based sessions** - セッション永続化

---

## データベーススキーマ

### テーブル構成

#### `users`
ユーザー情報管理
- Manus OAuth連携
- ロールベースアクセス制御(admin/user)

#### `meetings`
Zoom会議情報
- Zoom Meeting ID / Recording ID
- 会議メタデータ(トピック、開始時刻、時間)
- 処理ステータス(pending/processing/completed/failed)
- 会議種類(interview/regular)
- 面接ステージ(first/second/final/other)

#### `transcripts`
文字起こしデータ
- プレーンテキスト
- VTT形式(タイムスタンプ付き)
- 言語情報

#### `minutes`
生成された議事録
- 要約
- 主要ポイント(JSON配列)
- 決定事項(JSON配列)
- **面接専用フィールド**:
  - 候補者名
  - 評価ポイント(JSON)
  - 推薦度
  - LINEメッセージ

#### `actionItems`
アクションアイテム
- 説明
- 担当者
- 期限
- 優先度(low/medium/high)
- ステータス(pending/in_progress/completed/cancelled)

#### `promptTemplates`
カスタマイズ可能なプロンプト
- プロンプト名
- タイプ(interview_first/interview_second/regular_meeting/custom)
- システムプロンプト
- ユーザープロンプトテンプレート

---

## アーキテクチャパターン

### API設計
- **tRPC** - RESTの代わりにRPCスタイル
- **型安全** - フロントエンドとバックエンドで型を共有
- **プロシージャベース** - `query`(読み取り)と`mutation`(書き込み)

### データフロー

```
Zoom録画完了
  ↓
Webhook受信 (/api/webhooks/zoom)
  ↓
文字起こしダウンロード
  ↓
DB保存(meetings, transcripts)
  ↓
AI処理(自動実行)
  ├─ 会議種類判定
  ├─ 議事録生成
  └─ アクションアイテム抽出
  ↓
DB保存(minutes, actionItems)
  ↓
ステータス更新(completed)
```

### セキュリティ
- **Webhook署名検証** - HMAC SHA256
- **OAuth認証** - Manus OAuth + Zoom Server-to-Server
- **環境変数管理** - 機密情報の分離
- **CORS設定** - 適切なオリジン制限

---

## 開発ツール

### ビルド・実行
- **tsx** - TypeScript実行環境
- **esbuild** - 高速バンドラー
- **Vite** - 開発サーバー

### コード品質
- **TypeScript** - 静的型チェック
- **Prettier** - コードフォーマッター
- **Vitest** - ユニットテスト

### パッケージ管理
- **pnpm** - 高速パッケージマネージャー

---

## デプロイ環境

### 環境変数

#### データベース
- `DATABASE_URL` - MySQL/TiDB接続文字列

#### Zoom API
- `ZOOM_ACCOUNT_ID` - ZoomアカウントID
- `ZOOM_CLIENT_ID` - OAuth Client ID
- `ZOOM_CLIENT_SECRET` - OAuth Client Secret
- `ZOOM_WEBHOOK_SECRET_TOKEN` - Webhook署名検証トークン

#### Manus認証
- `JWT_SECRET` - セッション署名キー
- `OAUTH_SERVER_URL` - Manus OAuth サーバーURL
- `VITE_OAUTH_PORTAL_URL` - Manus ログインポータルURL
- `OWNER_OPEN_ID` / `OWNER_NAME` - オーナー情報

#### Manus LLM API
- `BUILT_IN_FORGE_API_URL` - Manus API エンドポイント
- `BUILT_IN_FORGE_API_KEY` - サーバーサイドAPIキー
- `VITE_FRONTEND_FORGE_API_KEY` - フロントエンド用APIキー

---

## 主要機能

### 1. Zoom連携
- Webhook自動受信
- 録画ファイルダウンロード(24時間有効なトークン)
- VTT形式文字起こし取得・解析

### 2. AI自動処理
- **会議種類判定**
  - 採用面接 or 通常会議
  - 面接ステージ分類
- **採用面接用議事録**
  - 候補者評価(技術/コミュニケーション/モチベーション/カルチャーフィット)
  - 推薦度
  - 候補者へのLINEメッセージ生成
- **通常会議用議事録**
  - 要約
  - 主要ポイント
  - 決定事項
  - アクションアイテム(担当者・期限・優先度付き)

### 3. プロンプトカスタマイズ
- ユーザー独自のプロンプト作成
- テンプレート保存・管理
- 再処理時にカスタムプロンプト適用

### 4. Web UI
- 会議一覧表示
- 会議詳細・議事録表示
- アクションアイテム管理
- プロンプト編集
- 手動再処理

---

## パフォーマンス最適化

### フロントエンド
- **React 19** - 自動バッチング、Suspense
- **tRPC + React Query** - 自動キャッシング、楽観的更新
- **Vite** - 高速HMR、コード分割

### バックエンド
- **トークンキャッシュ** - Zoom OAuth トークン再利用
- **非同期処理** - Webhook受信後のバックグラウンド処理
- **Drizzle ORM** - 効率的なクエリ生成

---

## 拡張性

### 今後の拡張可能性
- **他の会議ツール対応** - Google Meet、Microsoft Teams
- **多言語対応** - 文字起こし言語の自動検出
- **通知機能** - 処理完了時のメール/Slack通知
- **レポート機能** - 月次面接サマリー、会議統計
- **API公開** - 外部システムとの連携

---

## ライセンス
MIT License
