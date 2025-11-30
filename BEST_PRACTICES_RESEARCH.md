# ベストプラクティス調査結果

本ドキュメントは、全世界のコミュニティ(Reddit、Zenn、note等)とエンジニアリング記事から調査した、議事録自動生成システムのベストプラクティスをまとめたものです。

## 目次

1. [Webhook処理のベストプラクティス](#webhook処理のベストプラクティス)
2. [データストレージ戦略](#データストレージ戦略)
3. [AI議事録生成の精度向上](#ai議事録生成の精度向上)
4. [現在のシステムとの比較](#現在のシステムとの比較)
5. [推奨される改善事項](#推奨される改善事項)

---

## Webhook処理のベストプラクティス

### 出典
- [Webhooks Best Practices: Lessons from the Trenches (Medium)](https://medium.com/@xsronhou/webhooks-best-practices-lessons-from-the-trenches-57ade2871b33)
- [Why Implement Asynchronous Processing of Webhooks (Hookdeck)](https://hookdeck.com/webhooks/guides/why-implement-asynchronous-processing-webhooks)
- [Webhook Best Practices (Sanity)](https://www.sanity.io/docs/content-lake/webhook-best-practices)

### 1. **冪等性(Idempotency)の徹底**

**ベストプラクティス**:
- Webhookハンドラーは必ず冪等にする
- ユニークID(transaction_id, event_id等)を使用して重複処理を防ぐ
- 処理済みイベントをDBに記録し、再処理をスキップ

**実装例**:
```typescript
app.post('/webhooks/zoom', async (req, res) => {
  const { zoomRecordingId } = req.body;
  
  // 重複チェック
  const existing = await db.meetings.findByRecordingId(zoomRecordingId);
  if (existing) {
    return res.status(200).json({ message: 'Already processed' });
  }
  
  // 処理を実行
  await processMeeting(req.body);
  res.status(200).json({ success: true });
});
```

**現在のシステム**: ✅ **実装済み**
- `zoomRecordingId`を使用して重複チェックを実施
- 既存の会議が存在する場合はスキップ

---

### 2. **非同期キュー処理**

**ベストプラクティス**:
- Webhook受信エンドポイントは即座に200を返す(3秒以内)
- 実際の処理はキュー(Redis, BullMQ, AWS SQS等)に投入
- Webhookプロバイダーのタイムアウト(通常10-30秒)を超えないようにする

**実装例**:
```typescript
app.post('/webhooks/zoom', async (req, res) => {
  // 1. 署名検証
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. キューに投入(即座に完了)
  await queue.add('process-meeting', req.body);
  
  // 3. すぐに200を返す
  res.status(200).json({ success: true });
});

// 別のワーカープロセスで処理
queue.process('process-meeting', async (job) => {
  await downloadTranscript(job.data);
  await generateMinutes(job.data);
});
```

**現在のシステム**: ❌ **未実装**
- Webhook受信時に同期的に文字起こしダウンロードとAI処理を実行
- 処理時間が長い場合、Zoomのタイムアウトが発生する可能性

**リスク**:
- AI処理に30秒以上かかる場合、Zoomがタイムアウトして再送信
- 同じイベントが複数回処理される可能性(冪等性で防げるが非効率)

---

### 3. **適切なHTTPステータスコード**

**ベストプラクティス**:
- `200-299`: 成功(再送信なし)
- `400-499`: クライアントエラー(再送信なし、ただし408, 429は例外)
- `500-599`: サーバーエラー(再送信あり)

**実装例**:
```typescript
app.post('/webhooks/zoom', async (req, res) => {
  try {
    // バリデーションエラー → 400
    if (!req.body.zoomRecordingId) {
      return res.status(400).json({ error: 'Missing recordingId' });
    }
    
    // リソースが見つからない → 404(再送信なし)
    const meeting = await db.meetings.find(req.body.meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // 一時的なエラー → 503(再送信あり)
    if (db.isDown()) {
      return res.status(503).json({ error: 'Service unavailable' });
    }
    
    // 成功 → 200
    res.status(200).json({ success: true });
    
  } catch (error) {
    // 不明なエラー → 500(再送信あり)
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**現在のシステム**: ✅ **概ね実装済み**
- 署名検証失敗 → 400
- 処理成功 → 200
- エラー → 500

---

### 4. **タイムアウト設定**

**ベストプラクティス**:
- Webhook全体のタイムアウト: 8-10秒
- 個別操作のタイムアウト: 2-3秒
- Promise.race()を使用してタイムアウトを強制

**実装例**:
```typescript
app.post('/webhooks/zoom', async (req, res) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Webhook timeout')), 8000);
  });
  
  const processingPromise = processWebhook(req.body);
  
  try {
    await Promise.race([processingPromise, timeoutPromise]);
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).json({ error: 'Processing timeout' });
  }
});
```

**現在のシステム**: ❌ **未実装**
- タイムアウト設定なし
- 長時間処理がハングする可能性

---

### 5. **モニタリングとアラート**

**ベストプラクティス**:
- Webhook成功/失敗率を監視
- 処理時間のパーセンタイル(p50, p95, p99)を記録
- キューの深さと処理遅延を監視
- リトライ回数とパターンを追跡

**推奨ツール**:
- Prometheus + Grafana
- Datadog
- New Relic
- CloudWatch (AWS使用時)

**現在のシステム**: ❌ **未実装**
- 基本的なログ出力のみ
- メトリクス収集なし

---

## データストレージ戦略

### 出典
- [How large does data need to be before you use S3? (Reddit)](https://www.reddit.com/r/aws/comments/i5o4gu/how_large_does_data_need_to_be_before_you_use_s3/)
- [Using S3 as a database vs. database (StackOverflow)](https://stackoverflow.com/questions/56108144/using-s3-as-a-database-vs-database-e-g-mongodb)
- [Databases vs Blob Storage: What to Use and When (Medium)](https://medium.com/@harshithgowdakt/databases-vs-blob-storage-what-to-use-and-when-d5b1ec0d11cd)

### 文字起こしデータの保存戦略

**ベストプラクティス**:

| データタイプ | 推奨ストレージ | 理由 |
|------------|-------------|------|
| **メタデータ**(会議ID、日時、参加者等) | **データベース** | クエリ、検索、リレーション管理に最適 |
| **文字起こしテキスト**(数KB~数MB) | **データベース or S3** | サイズと使用頻度による |
| **録画ファイル**(数百MB~数GB) | **S3** | 大容量ファイルはBlob Storageが最適 |
| **生成された議事録**(数KB) | **データベース** | 頻繁にクエリされるため |

### 文字起こしテキストの保存判断基準

**データベースに保存すべき場合**:
- テキストサイズが **1MB未満**
- **頻繁に検索・クエリ**される
- **リアルタイム処理**が必要
- **トランザクション整合性**が重要

**S3に保存すべき場合**:
- テキストサイズが **1MB以上**
- **アーカイブ目的**で長期保存
- **コスト削減**が優先
- **検索頻度が低い**

### 現在のシステムの評価

**現在の実装**:
```typescript
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  fullText: text("fullText").notNull(),  // ← データベースに保存
  vttContent: text("vttContent"),        // ← データベースに保存
  language: varchar("language", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**評価**: ⚠️ **改善の余地あり**

**問題点**:
1. **大容量テキストの保存**: 長時間会議(2時間以上)の文字起こしは数MBになる可能性
2. **データベース肥大化**: MySQLの`TEXT`型は最大64KBまで、それ以上は`MEDIUMTEXT`(16MB)が必要
3. **検索パフォーマンス**: 全文検索にはインデックスが必要だが、大量のテキストデータはインデックスサイズを肥大化させる

**推奨改善策**:

#### オプション1: ハイブリッドアプローチ(推奨)
```typescript
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  
  // メタデータはDBに保存
  language: varchar("language", { length: 10 }),
  wordCount: int("wordCount"),
  duration: int("duration"), // 秒単位
  
  // 実際のテキストはS3に保存
  s3Key: varchar("s3Key", { length: 255 }).notNull(),
  s3Url: text("s3Url"),
  
  // 検索用の要約(最初の500文字)のみDBに保存
  summary: varchar("summary", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**メリット**:
- データベースサイズを削減
- S3のコスト効率(DB保存の1/10以下)
- スケーラビリティ向上
- 検索用の要約はDBで高速クエリ可能

**デメリット**:
- S3からの取得に追加のAPI呼び出しが必要(数百ms)
- 実装の複雑性が増加

#### オプション2: 現状維持 + 最適化
```typescript
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  fullText: mediumtext("fullText").notNull(), // TEXT → MEDIUMTEXT (16MB)
  vttContent: mediumtext("vttContent"),
  language: varchar("language", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 全文検索インデックスを追加
CREATE FULLTEXT INDEX idx_transcript_fulltext ON transcripts(fullText);
```

**メリット**:
- 実装がシンプル
- レイテンシーが低い(S3呼び出し不要)
- トランザクション整合性が保証

**デメリット**:
- データベースサイズが大きくなる
- コストが高い(S3の約10倍)
- スケーラビリティに限界

### 推奨アプローチ

**短期的(現状維持)**:
- `TEXT` → `MEDIUMTEXT`に変更
- 全文検索インデックスを追加
- 会議数が少ない間(~1000件)はこれで十分

**長期的(スケール時)**:
- 文字起こしテキストをS3に移行
- DBには要約とメタデータのみ保存
- ベクトルデータベース(Pinecone, Weaviate)を使用した意味検索を検討

---

## AI議事録生成の精度向上

### 出典
- [Spent 30 Minutes Writing Meeting Minutes Again? (Reddit)](https://www.reddit.com/r/PromptEngineering/comments/1oqxpz6/spent_30_minutes_writing_meeting_minutes_again_i/)
- [ChatGPTで議事録作成する方法・プロンプト・コツを徹底解説](https://rimo.app/blogs/chatgpt-gijiroku)
- [最高精度の議事録の書き方を大公開！ [ZOOM+Claude3 Opus]](https://tanren.jp/blog/ai-insights/2024/04/12)
- [【AI議事録】ChatGPT初心者向けに精度を上げる実践3ポイント](https://ainow.ai/2025/04/25/277584/)

### 1. **プロンプトエンジニアリングのベストプラクティス**

#### (1) 構造化出力の強制

**ベストプラクティス**:
- JSON Schemaを使用して出力形式を厳密に定義
- `strict: true`を設定して構造化出力を強制

**現在のシステム**: ✅ **実装済み**
```typescript
response_format: {
  type: "json_schema",
  json_schema: {
    name: "meeting_classification",
    strict: true,
    schema: { /* ... */ }
  }
}
```

#### (2) Few-Shot Learning(例示学習)

**ベストプラクティス**:
- プロンプトに具体例を3-5個含める
- 良い例と悪い例の両方を示す

**実装例**:
```typescript
const systemPrompt = `
あなたは議事録作成の専門家です。

# 良い議事録の例:
## 会議: プロジェクトキックオフ
- 目的: 新規プロジェクトの開始
- 決定事項: 開発期間3ヶ月、予算500万円
- アクション: 要件定義書作成(田中、来週金曜まで)

# 悪い議事録の例:
- 会議しました
- いろいろ話しました
- 次回また話します

以下の文字起こしから、良い議事録の例に従って議事録を作成してください。
`;
```

**現在のシステム**: ❌ **未実装**
- Few-Shot Learningなし
- 精度向上の余地あり

#### (3) Chain-of-Thought(思考の連鎖)

**ベストプラクティス**:
- AIに「段階的に考えさせる」指示を追加
- 中間推論ステップを出力させる

**実装例**:
```typescript
const userPrompt = `
以下の文字起こしを分析してください:

${transcript}

# ステップ1: 会議の目的を特定
# ステップ2: 主要な議論ポイントを抽出
# ステップ3: 決定事項を明確化
# ステップ4: アクションアイテムを整理

最終的な議事録を作成してください。
`;
```

**現在のシステム**: ❌ **未実装**

#### (4) 文脈の提供

**ベストプラクティス**:
- 会議のメタデータ(参加者、日時、トピック)を含める
- 過去の会議議事録を参照情報として提供

**実装例**:
```typescript
const contextPrompt = `
# 会議情報
- 日時: 2025年1月30日 14:00-15:00
- 参加者: 田中(PM), 鈴木(エンジニア), 佐藤(デザイナー)
- トピック: ${meeting.topic}

# 過去の関連会議
- 前回(1/23): 要件定義完了、設計フェーズ開始を決定
- 前々回(1/16): プロジェクトキックオフ

# 今回の文字起こし
${transcript}

上記の文脈を踏まえて議事録を作成してください。
`;
```

**現在のシステム**: ⚠️ **部分実装**
- 会議トピックは含まれる
- 過去の議事録参照は未実装

---

### 2. **音声認識精度の向上**

**ベストプラクティス**(Zennコミュニティより):

1. **マイク選び**
   - 指向性マイク(単一指向性)を使用
   - ノイズキャンセリング機能付き
   - 推奨: Blue Yeti, Shure MV7

2. **録音設定**
   - サンプリングレート: 48kHz以上
   - ビットレート: 192kbps以上
   - フォーマット: WAV > MP3

3. **話し方**
   - ゆっくり、はっきり話す
   - 専門用語は事前にZoom設定で登録
   - 発言者を明示("田中です。〜")

**現在のシステム**: ✅ **Zoom依存**
- Zoomの文字起こし機能を使用
- ユーザー側で音声設定を最適化する必要あり

---

### 3. **議事録フォーマットのカスタマイズ**

**ベストプラクティス**(noteコミュニティより):

**会議種類別のテンプレート**:

| 会議種類 | 必須項目 | オプション項目 |
|---------|---------|--------------|
| **採用面接** | 候補者名、評価、推薦度 | スキル詳細、カルチャーフィット |
| **取引先** | 取引先名、合意事項、次のステップ | 参加者、フォローアップメール |
| **社内会議** | 要約、決定事項、アクション | 議論ポイント、懸念事項 |
| **1on1** | 目標進捗、フィードバック、次回アクション | キャリア相談、悩み |

**現在のシステム**: ✅ **実装済み**
- 7種類の会議タイプに対応
- 各タイプ専用のフォーマット

---

### 4. **後処理と検証**

**ベストプラクティス**:
- AI生成後に人間が確認・修正
- 重要な会議は複数のLLM(GPT-4, Claude, Gemini)で生成して比較
- 定期的にフィードバックループを回す

**実装例**:
```typescript
// 複数LLMで生成して比較
const [gptResult, claudeResult] = await Promise.all([
  generateWithGPT(transcript),
  generateWithClaude(transcript)
]);

// 一致度をチェック
const similarity = calculateSimilarity(gptResult, claudeResult);
if (similarity < 0.7) {
  // 不一致が大きい場合は人間確認を促す
  await notifyOwner({
    title: "議事録の確認が必要です",
    content: `2つのAIで生成結果が異なります。確認してください。`
  });
}
```

**現在のシステム**: ❌ **未実装**
- 単一LLMのみ使用
- 検証機能なし

---

## 現在のシステムとの比較

### 実装状況サマリー

| カテゴリ | 項目 | 現在の実装 | ベストプラクティス | ギャップ |
|---------|------|-----------|------------------|---------|
| **Webhook** | 冪等性 | ✅ 実装済み | ✅ 推奨 | なし |
| **Webhook** | 非同期キュー | ❌ 未実装 | ✅ 必須 | **大** |
| **Webhook** | タイムアウト設定 | ❌ 未実装 | ✅ 推奨 | 中 |
| **Webhook** | モニタリング | ❌ 未実装 | ✅ 推奨 | 中 |
| **ストレージ** | 文字起こし保存 | ⚠️ DB保存 | ⚠️ S3推奨(大容量時) | 小 |
| **ストレージ** | 録画ファイル | ✅ S3参照 | ✅ S3推奨 | なし |
| **AI** | 構造化出力 | ✅ 実装済み | ✅ 推奨 | なし |
| **AI** | Few-Shot Learning | ❌ 未実装 | ✅ 推奨 | 中 |
| **AI** | Chain-of-Thought | ❌ 未実装 | ⚠️ オプション | 小 |
| **AI** | 文脈提供 | ⚠️ 部分実装 | ✅ 推奨 | 小 |
| **AI** | 複数LLM検証 | ❌ 未実装 | ⚠️ オプション | 小 |

---

## 推奨される改善事項

### 優先度: 高(Critical)

#### 1. **非同期キュー処理の実装**

**理由**:
- Webhookタイムアウトによる再送信を防ぐ
- システムの信頼性とスケーラビリティを向上

**実装方法**:
```bash
# BullMQをインストール
pnpm add bullmq ioredis

# Redisをセットアップ(Docker)
docker run -d -p 6379:6379 redis:alpine
```

```typescript
// server/queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const meetingQueue = new Queue('meeting-processing', { connection });

// Webhookハンドラー
app.post('/api/webhooks/zoom', async (req, res) => {
  // 署名検証
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // キューに投入(即座に完了)
  await meetingQueue.add('process-recording', req.body.payload);
  
  // すぐに200を返す
  res.status(200).json({ success: true });
});

// ワーカー(別プロセスで実行可能)
const worker = new Worker('meeting-processing', async (job) => {
  const payload = job.data;
  
  // 文字起こしダウンロード
  const transcript = await downloadTranscript(payload);
  
  // AI処理
  await processWithAI(transcript);
  
}, { connection });
```

**工数見積もり**: 4-6時間

---

#### 2. **タイムアウト設定の追加**

**理由**:
- 長時間処理のハングを防ぐ
- リソースリークを防止

**実装方法**:
```typescript
// server/webhookHandler.ts
export async function handleRecordingCompleted(payload: any) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Processing timeout')), 25000); // 25秒
  });
  
  const processingPromise = (async () => {
    // 文字起こしダウンロード(タイムアウト: 10秒)
    const transcript = await Promise.race([
      downloadTranscript(payload),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Download timeout')), 10000))
    ]);
    
    // AI処理(タイムアウト: 15秒)
    await Promise.race([
      processWithAI(transcript),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);
  })();
  
  try {
    await Promise.race([processingPromise, timeoutPromise]);
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  }
}
```

**工数見積もり**: 2時間

---

### 優先度: 中(Recommended)

#### 3. **Few-Shot Learningの追加**

**理由**:
- AI議事録の精度を向上
- 一貫性のある出力を生成

**実装方法**:
```typescript
// server/aiService.ts
const FEW_SHOT_EXAMPLES = {
  interview: `
# 良い採用面接議事録の例:
候補者名: 山田太郎
評価ポイント:
- 技術力: 8/10 - Reactの実務経験3年、TypeScriptに精通
- コミュニケーション: 9/10 - 質問に的確に回答、説明が分かりやすい
推薦度: 強く推薦 - チームにフィットすると判断

# 悪い例:
候補者はいい人でした。採用したいです。
`,
  client_meeting: `
# 良い取引先打ち合わせ議事録の例:
取引先: 株式会社ABC
合意事項:
1. 納期を2月末に設定
2. 予算は500万円で確定
次のステップ:
- 要件定義書を来週提出(担当: 田中)
- 次回打ち合わせ: 2/10 14:00

# 悪い例:
いろいろ話しました。次回また話します。
`
};

function buildPromptWithExamples(meetingType: string, transcript: string) {
  const examples = FEW_SHOT_EXAMPLES[meetingType] || '';
  
  return `
${examples}

以下の文字起こしから、上記の良い例に従って議事録を作成してください:

${transcript}
`;
}
```

**工数見積もり**: 3-4時間

---

#### 4. **文字起こしのS3移行(スケール時)**

**理由**:
- データベースサイズを削減
- コスト削減(DB保存の1/10)
- スケーラビリティ向上

**実装方法**:
```typescript
// server/zoomService.ts
import { storagePut } from './storage';

export async function saveTranscriptToS3(meetingId: number, text: string) {
  const key = `transcripts/${meetingId}/${Date.now()}.txt`;
  const { url } = await storagePut(key, text, 'text/plain');
  
  return { s3Key: key, s3Url: url };
}

// データベーススキーマ更新
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  
  // S3参照
  s3Key: varchar("s3Key", { length: 255 }).notNull(),
  s3Url: text("s3Url"),
  
  // 検索用要約(最初の500文字)
  summary: varchar("summary", { length: 500 }),
  
  language: varchar("language", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 取得時
export async function getTranscriptText(transcript: Transcript): Promise<string> {
  if (transcript.s3Url) {
    const response = await fetch(transcript.s3Url);
    return await response.text();
  }
  // 後方互換性: 古いデータはDBから取得
  return transcript.fullText || '';
}
```

**工数見積もり**: 6-8時間(マイグレーション含む)

---

### 優先度: 低(Optional)

#### 5. **モニタリングとアラート**

**理由**:
- 問題の早期発見
- システムの健全性を可視化

**実装方法**:
```typescript
// server/metrics.ts
import { Counter, Histogram } from 'prom-client';

export const webhookCounter = new Counter({
  name: 'webhook_requests_total',
  help: 'Total number of webhook requests',
  labelNames: ['status', 'event_type']
});

export const processingDuration = new Histogram({
  name: 'meeting_processing_duration_seconds',
  help: 'Duration of meeting processing',
  labelNames: ['stage'],
  buckets: [1, 5, 10, 30, 60, 120]
});

// 使用例
app.post('/api/webhooks/zoom', async (req, res) => {
  const timer = processingDuration.startTimer();
  
  try {
    await processWebhook(req.body);
    webhookCounter.inc({ status: 'success', event_type: req.body.event });
    res.status(200).send('OK');
  } catch (error) {
    webhookCounter.inc({ status: 'error', event_type: req.body.event });
    res.status(500).send('Error');
  } finally {
    timer({ stage: 'total' });
  }
});
```

**工数見積もり**: 4-6時間

---

#### 6. **複数LLMによる検証**

**理由**:
- 生成品質の向上
- 重要な会議の精度保証

**実装方法**:
```typescript
// server/aiService.ts
async function generateWithMultipleLLMs(transcript: string) {
  const [gptResult, claudeResult] = await Promise.all([
    generateWithGPT(transcript),
    generateWithClaude(transcript) // Claude APIを追加実装
  ]);
  
  // 一致度チェック
  const similarity = calculateSimilarity(gptResult.summary, claudeResult.summary);
  
  if (similarity < 0.7) {
    // 不一致が大きい場合は通知
    await notifyOwner({
      title: "議事録の確認が必要です",
      content: `AIの生成結果に差異があります。確認してください。`
    });
  }
  
  // 両方の結果を保存
  return {
    primary: gptResult,
    secondary: claudeResult,
    similarity
  };
}
```

**工数見積もり**: 6-8時間

---

## まとめ

### 現在のシステムの強み
- ✅ Webhook冪等性の実装
- ✅ 構造化出力(JSON Schema)の使用
- ✅ 7種類の会議タイプ対応
- ✅ S3を使用した録画ファイル管理

### 改善が必要な領域
- ❌ 非同期キュー処理(最優先)
- ❌ タイムアウト設定(高優先)
- ❌ Few-Shot Learning(中優先)
- ❌ モニタリング(低優先)

### 推奨実装順序

1. **Phase 1(1-2日)**: 非同期キュー処理 + タイムアウト設定
2. **Phase 2(半日)**: Few-Shot Learning追加
3. **Phase 3(1日)**: 文字起こしS3移行(スケール時)
4. **Phase 4(半日)**: モニタリング追加

これらの改善により、システムの信頼性、スケーラビリティ、AI精度が大幅に向上します。
