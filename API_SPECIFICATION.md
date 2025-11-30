# API仕様書

本ドキュメントは、Zoom議事録自動生成システムのAPI仕様を詳細に記載します。

## 目次

1. [Webhook API](#webhook-api)
2. [tRPC API](#trpc-api)
3. [データ型定義](#データ型定義)
4. [エラーハンドリング](#エラーハンドリング)

## Webhook API

### POST /api/webhooks/zoom

Zoomからのイベント通知を受信するエンドポイントです。

#### リクエスト

**ヘッダー**:
```
Content-Type: application/json
x-zm-signature: <HMAC SHA256 署名>
x-zm-request-timestamp: <Unix timestamp (ミリ秒)>
```

**署名検証**:
```
message = `v0:${timestamp}:${requestBody}`
signature = HMAC_SHA256(ZOOM_WEBHOOK_SECRET_TOKEN, message)
expected = `v0=${signature}`
```

`x-zm-signature`が`expected`と一致することを確認します。

**ボディ(recording.completed イベント)**:
```json
{
  "event": "recording.completed",
  "payload": {
    "object": {
      "uuid": "会議UUID",
      "id": 123456789,
      "host_id": "ホストID",
      "topic": "会議トピック",
      "start_time": "2024-01-01T10:00:00Z",
      "duration": 60,
      "recording_files": [
        {
          "id": "録画ファイルID",
          "recording_start": "2024-01-01T10:00:00Z",
          "recording_end": "2024-01-01T11:00:00Z",
          "file_type": "MP4",
          "file_size": 123456789,
          "download_url": "https://zoom.us/rec/download/...",
          "recording_type": "shared_screen_with_speaker_view"
        },
        {
          "id": "文字起こしファイルID",
          "file_type": "TRANSCRIPT",
          "file_size": 12345,
          "download_url": "https://zoom.us/rec/download/...",
          "recording_type": "audio_transcript"
        }
      ],
      "download_access_token": "24時間有効なトークン"
    }
  }
}
```

#### レスポンス

**成功(200 OK)**:
```json
{
  "success": true
}
```

**エラー(400 Bad Request)**:
```json
{
  "error": "Invalid signature"
}
```

**エラー(500 Internal Server Error)**:
```json
{
  "error": "Processing failed",
  "details": "エラーメッセージ"
}
```

#### 処理フロー

1. **署名検証**: `x-zm-signature`を検証
2. **会議情報保存**: `meetings`テーブルに保存
3. **文字起こしダウンロード**: VTT形式をダウンロード
4. **文字起こし保存**: `transcripts`テーブルに保存
5. **AI処理開始**: 会議種類判定 → 議事録生成
6. **ステータス更新**: `completed`または`failed`

## tRPC API

### 認証

すべてのtRPC APIエンドポイントは`protectedProcedure`で保護されており、Manus OAuth認証が必要です。

**認証方法**:
- クッキーベース認証
- セッションクッキー名: `manus_session`

### meetings.list

全会議の一覧を取得します。

#### リクエスト

```typescript
// 入力なし
```

#### レスポンス

```typescript
type Meeting = {
  id: number;
  zoomMeetingId: string;
  zoomRecordingId: string | null;
  zoomUuid: string;
  topic: string;
  hostId: string;
  hostEmail: string | null;
  startTime: Date;
  duration: number;
  recordingUrl: string | null;
  downloadUrl: string | null;
  downloadToken: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processingError: string | null;
  meetingType: 'interview' | 'internal_meeting' | 'client_meeting' | 'one_on_one' | 'training' | 'presentation' | 'other' | null;
  interviewStage: 'first' | 'second' | 'final' | 'other' | null;
  meetingSubType: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// レスポンス
Meeting[]
```

#### 使用例

```typescript
const { data: meetings, isLoading } = trpc.meetings.list.useQuery();
```

### meetings.getById

会議の詳細情報を取得します。議事録、文字起こし、アクションアイテムも含まれます。

#### リクエスト

```typescript
{
  id: number;
}
```

#### レスポンス

```typescript
type MeetingDetail = {
  meeting: Meeting;
  transcript: Transcript | null;
  minutes: Minute | null;
  actionItems: ActionItem[];
};

type Transcript = {
  id: number;
  meetingId: number;
  fullText: string;
  vttContent: string | null;
  language: string | null;
  createdAt: Date;
};

type Minute = {
  id: number;
  meetingId: number;
  summary: string;
  keyPoints: string[] | null;
  decisions: string[] | null;
  candidateName: string | null;
  evaluationPoints: Record<string, any> | null;
  recommendation: string | null;
  lineMessage: string | null;
  customPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ActionItem = {
  id: number;
  meetingId: number;
  description: string;
  assignee: string | null;
  dueDate: Date | null;
  priority: 'low' | 'medium' | 'high' | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
};
```

#### 使用例

```typescript
const { data, isLoading } = trpc.meetings.getById.useQuery({ id: 1 });

if (data) {
  console.log(data.meeting.topic);
  console.log(data.minutes?.summary);
  console.log(data.actionItems);
}
```

### meetings.reprocess

会議を再処理します。既存の議事録とアクションアイテムを削除し、新しいプロンプトでAI処理を再実行します。

#### リクエスト

```typescript
{
  meetingId: number;
  customPromptId?: number; // オプション: カスタムプロンプトID
}
```

#### レスポンス

```typescript
{
  success: boolean;
  message: string;
}
```

#### 処理フロー

1. 会議の存在確認
2. ステータスを`processing`に更新
3. 既存の議事録を削除
4. 既存のアクションアイテムを削除
5. AI処理を再実行(カスタムプロンプト適用可能)
6. ステータスを`completed`または`failed`に更新

#### 使用例

```typescript
const reprocessMutation = trpc.meetings.reprocess.useMutation();

// デフォルトプロンプトで再処理
await reprocessMutation.mutateAsync({ meetingId: 1 });

// カスタムプロンプトで再処理
await reprocessMutation.mutateAsync({ 
  meetingId: 1, 
  customPromptId: 5 
});
```

### prompts.list

プロンプトテンプレート一覧を取得します。

#### リクエスト

```typescript
// 入力なし
```

#### レスポンス

```typescript
type PromptTemplate = {
  id: number;
  userId: number;
  name: string;
  type: 'interview_first' | 'interview_second' | 'regular_meeting' | 'custom';
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// レスポンス
PromptTemplate[]
```

#### 使用例

```typescript
const { data: prompts, isLoading } = trpc.prompts.list.useQuery();
```

### prompts.create

新しいプロンプトテンプレートを作成します。

#### リクエスト

```typescript
{
  name: string;
  type: 'interview_first' | 'interview_second' | 'regular_meeting' | 'custom';
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault?: boolean; // デフォルト: false
}
```

#### レスポンス

```typescript
PromptTemplate
```

#### 使用例

```typescript
const createPromptMutation = trpc.prompts.create.useMutation();

await createPromptMutation.mutateAsync({
  name: "詳細な採用面接評価",
  type: "interview_first",
  systemPrompt: "あなたは経験豊富な採用担当者です。",
  userPromptTemplate: "以下の面接文字起こしから詳細な評価を作成してください:\n\n{{transcript}}",
  isDefault: true
});
```

### prompts.update

プロンプトテンプレートを更新します。

#### リクエスト

```typescript
{
  id: number;
  name?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  isDefault?: boolean;
}
```

#### レスポンス

```typescript
PromptTemplate
```

#### 使用例

```typescript
const updatePromptMutation = trpc.prompts.update.useMutation();

await updatePromptMutation.mutateAsync({
  id: 1,
  name: "更新されたプロンプト名",
  isDefault: true
});
```

### prompts.delete

プロンプトテンプレートを削除します。

#### リクエスト

```typescript
{
  id: number;
}
```

#### レスポンス

```typescript
{
  success: boolean;
}
```

#### 使用例

```typescript
const deletePromptMutation = trpc.prompts.delete.useMutation();

await deletePromptMutation.mutateAsync({ id: 1 });
```

## データ型定義

### MeetingType

```typescript
type MeetingType = 
  | 'interview'          // 採用面接
  | 'internal_meeting'   // 社内会議
  | 'client_meeting'     // 取引先との打ち合わせ
  | 'one_on_one'         // 1on1ミーティング
  | 'training'           // 研修・トレーニング
  | 'presentation'       // プレゼン・説明会
  | 'other';             // その他
```

### InterviewStage

```typescript
type InterviewStage = 
  | 'first'   // 一次面接
  | 'second'  // 二次面接
  | 'final'   // 最終面接
  | 'other';  // その他
```

### MeetingStatus

```typescript
type MeetingStatus = 
  | 'pending'     // 処理待ち
  | 'processing'  // 処理中
  | 'completed'   // 完了
  | 'failed';     // 失敗
```

### ActionItemPriority

```typescript
type ActionItemPriority = 
  | 'low'     // 低
  | 'medium'  // 中
  | 'high';   // 高
```

### ActionItemStatus

```typescript
type ActionItemStatus = 
  | 'pending'      // 未着手
  | 'in_progress'  // 進行中
  | 'completed'    // 完了
  | 'cancelled';   // キャンセル
```

### PromptType

```typescript
type PromptType = 
  | 'interview_first'   // 一次面接用
  | 'interview_second'  // 二次面接用
  | 'regular_meeting'   // 通常会議用
  | 'custom';           // カスタム
```

### EvaluationPoints (採用面接用)

```typescript
type EvaluationPoints = {
  technical_skills: {
    score: number;        // 1-10
    comments: string;
  };
  communication: {
    score: number;        // 1-10
    comments: string;
  };
  motivation: {
    score: number;        // 1-10
    comments: string;
  };
  culture_fit: {
    score: number;        // 1-10
    comments: string;
  };
  overall: {
    score: number;        // 1-10
    comments: string;
  };
};
```

### ClientMeetingMinutes (取引先打ち合わせ用)

```typescript
type ClientMeetingMinutes = {
  clientName: string;
  participants: string[];
  discussionPoints: string[];
  agreements: string[];
  nextSteps: string[];
  followUpEmail: string;  // 自動生成されたメール案
};
```

## エラーハンドリング

### tRPCエラー

tRPCは以下のエラーコードを使用します:

```typescript
type TRPCErrorCode = 
  | 'BAD_REQUEST'          // 400: 不正なリクエスト
  | 'UNAUTHORIZED'         // 401: 認証が必要
  | 'FORBIDDEN'            // 403: アクセス権限なし
  | 'NOT_FOUND'            // 404: リソースが見つからない
  | 'INTERNAL_SERVER_ERROR'; // 500: サーバーエラー
```

### エラーレスポンス例

```typescript
{
  error: {
    message: "Meeting not found",
    code: "NOT_FOUND",
    data: {
      code: "NOT_FOUND",
      httpStatus: 404,
      path: "meetings.getById"
    }
  }
}
```

### フロントエンドでのエラーハンドリング

```typescript
const { data, error, isLoading } = trpc.meetings.getById.useQuery({ id: 1 });

if (error) {
  if (error.data?.code === 'NOT_FOUND') {
    console.error('会議が見つかりません');
  } else if (error.data?.code === 'UNAUTHORIZED') {
    console.error('ログインが必要です');
  } else {
    console.error('エラーが発生しました:', error.message);
  }
}
```

### Mutationのエラーハンドリング

```typescript
const reprocessMutation = trpc.meetings.reprocess.useMutation({
  onError: (error) => {
    if (error.data?.code === 'NOT_FOUND') {
      toast.error('会議が見つかりません');
    } else {
      toast.error('再処理に失敗しました: ' + error.message);
    }
  },
  onSuccess: () => {
    toast.success('再処理を開始しました');
  }
});
```

## レート制限

現在、レート制限は実装されていません。将来的には以下のレート制限を検討しています:

- **Webhook**: 1分あたり100リクエスト
- **tRPC API**: ユーザーあたり1分あたり60リクエスト

## セキュリティ

### Webhook署名検証

Zoom Webhookは必ず署名検証を行います。署名が一致しない場合は`400 Bad Request`を返します。

### 認証

tRPC APIはすべて`protectedProcedure`で保護されており、Manus OAuth認証が必要です。未認証の場合は`401 UNAUTHORIZED`を返します。

### CORS

開発環境では`localhost`からのリクエストを許可します。本番環境では適切なCORS設定を行ってください。

## バージョニング

現在のAPIバージョン: **v1**

将来的な破壊的変更がある場合は、新しいバージョン(v2)を作成します。

## サポート

API仕様に関する質問や問題がある場合は、GitHubのIssueを作成してください:
https://github.com/nagiando-byte/zoom-mojiokoshi/issues
