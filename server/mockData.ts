// モックデータ（データベース未接続時用）
export const mockMeetings = [
  {
    id: 1,
    zoomMeetingId: "12345678901",
    zoomRecordingId: "rec001",
    zoomUuid: null,
    topic: "エンジニア採用 - 一次面接（田中太郎さん）",
    hostId: "host123",
    hostEmail: "hr@company.com",
    startTime: new Date("2024-12-01T14:00:00"),
    duration: 45,
    shareUrl: null,
    downloadUrl: null,
    downloadToken: null,
    status: "completed" as const,
    processingError: null,
    meetingType: "interview" as const,
    interviewStage: "first" as const,
    meetingSubType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    zoomMeetingId: "12345678902",
    zoomRecordingId: null,
    zoomUuid: null,
    topic: "プロダクト開発 週次MTG",
    hostId: "host123",
    hostEmail: "pm@company.com",
    startTime: new Date("2024-12-02T10:00:00"),
    duration: 60,
    shareUrl: null,
    downloadUrl: null,
    downloadToken: null,
    status: "completed" as const,
    processingError: null,
    meetingType: "internal_meeting" as const,
    interviewStage: null,
    meetingSubType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    zoomMeetingId: "12345678903",
    zoomRecordingId: null,
    zoomUuid: null,
    topic: "ABC株式会社 - システム導入打ち合わせ",
    hostId: "host123",
    hostEmail: "sales@company.com",
    startTime: new Date("2024-12-03T15:00:00"),
    duration: 30,
    shareUrl: null,
    downloadUrl: null,
    downloadToken: null,
    status: "completed" as const,
    processingError: null,
    meetingType: "client_meeting" as const,
    interviewStage: null,
    meetingSubType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    zoomMeetingId: "12345678904",
    zoomRecordingId: null,
    zoomUuid: null,
    topic: "新機能企画会議",
    hostId: "host123",
    hostEmail: "pm@company.com",
    startTime: new Date("2024-12-03T16:00:00"),
    duration: 45,
    shareUrl: null,
    downloadUrl: null,
    downloadToken: null,
    status: "processing" as const,
    processingError: null,
    meetingType: "internal_meeting" as const,
    interviewStage: null,
    meetingSubType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    zoomMeetingId: "12345678905",
    zoomRecordingId: null,
    zoomUuid: null,
    topic: "全社会議",
    hostId: "host123",
    hostEmail: "ceo@company.com",
    startTime: new Date("2024-12-02T09:00:00"),
    duration: 90,
    shareUrl: null,
    downloadUrl: null,
    downloadToken: null,
    status: "failed" as const,
    processingError: "文字起こしデータの取得に失敗しました",
    meetingType: "internal_meeting" as const,
    interviewStage: null,
    meetingSubType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockMeetingDetails: Record<number, any> = {
  1: {
    transcript: {
      id: 1,
      meetingId: 1,
      fullText: `面接官: 本日はお時間いただきありがとうございます。まず自己紹介をお願いできますか？

田中: はい、田中太郎と申します。現在、前職では3年間Webエンジニアとして勤務しており、主にReactとNode.jsを使ったフルスタック開発を担当しています。特にパフォーマンス最適化やCI/CD環境の構築に力を入れてきました。

面接官: なるほど。具体的にどのようなプロジェクトに携わっていましたか？

田中: 主にEコマースサイトの開発を担当していました。月間100万PVを超えるサイトで、ページロード時間を3秒から1秒以下に改善したことが大きな成果です。また、テストカバレッジを30%から85%まで向上させました。

面接官: 素晴らしいですね。転職を考えたきっかけは何でしょうか？

田中: より規模の大きいプロダクト開発に挑戦したいと考えています。また、御社のエンジニアリング文化やチーム開発の進め方に共感し、自分の成長につながると感じました。

面接官: ありがとうございます。質問はありますか？

田中: はい、開発チームの体制やスプリント期間について教えていただけますか？

面接官: チームは5-7名で構成されており、2週間スプリントで開発しています。コードレビューを重視しており、品質向上に注力しています。`,
      vttContent: null,
      language: "ja",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    minutes: {
      id: 1,
      meetingId: 1,
      summary: "Webエンジニア職の一次面接を実施。候補者の技術力とコミュニケーション能力を評価しました。",
      keyPoints: JSON.stringify([
        "3年間のフルスタック開発経験（React, Node.js）",
        "パフォーマンス最適化の実績（3秒→1秒）",
        "テストカバレッジ向上の取り組み（30%→85%）",
        "より大規模なプロダクト開発への意欲",
      ]),
      decisions: JSON.stringify([
        "技術面での適性を確認",
        "二次面接へ進める",
      ]),
      candidateName: "田中太郎",
      evaluationPoints: "技術力: 4/5, コミュニケーション: 5/5, モチベーション: 4/5",
      recommendation: "二次面接へ進めることを推奨",
      lineMessage: null,
      generatedAt: new Date(),
      customPrompt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    actionItems: [
      {
        id: 1,
        meetingId: 1,
        description: "二次面接の日程調整",
        assignee: "人事担当",
        dueDate: new Date("2024-12-05"),
        priority: "high" as const,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  2: {
    transcript: {
      id: 2,
      meetingId: 2,
      fullText: `PM: 皆さんおはようございます。今週のスプリントレビューを始めます。まず開発チームから進捗をお願いします。

開発: 今週は新機能のユーザー登録フローを完成させました。UIのレスポンシブ対応も完了しています。ただ、決済機能の統合で予想外のAPIエラーが発生し、2日遅延しています。

PM: なるほど。APIエラーの原因は特定できていますか？

開発: はい、外部APIのレート制限に引っかかっていました。リトライロジックを追加することで解決できそうです。明日中には完了予定です。

デザイナー: UIの最終確認をしたいので、完成したらお知らせください。

PM: 了解しました。次にQAチームからお願いします。

QA: 前週リリース分のテストが完了しました。クリティカルなバグは発見されませんでしたが、マイナーな表示崩れを2件報告します。優先度は低いので次スプリントで対応予定です。

PM: ありがとうございます。では今週の重点タスクを確認します。決済機能の完成とモバイル対応を最優先で進めましょう。`,
      vttContent: null,
      language: "ja",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    minutes: {
      id: 2,
      meetingId: 2,
      summary: "プロダクト開発の週次進捗確認。新機能の開発状況とQA結果を共有しました。",
      keyPoints: JSON.stringify([
        "ユーザー登録フローが完成",
        "決済機能統合で2日遅延（APIレート制限が原因）",
        "前週リリースのテストは問題なし",
        "マイナーなバグ2件を発見",
      ]),
      decisions: JSON.stringify([
        "決済機能の完成を最優先",
        "リトライロジックを追加して対応",
        "マイナーバグは次スプリントで修正",
      ]),
      candidateName: null,
      evaluationPoints: null,
      recommendation: null,
      lineMessage: null,
      generatedAt: new Date(),
      customPrompt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    actionItems: [
      {
        id: 2,
        meetingId: 2,
        description: "決済API統合のリトライロジック実装",
        assignee: "開発チーム",
        dueDate: new Date("2024-12-03"),
        priority: "high" as const,
        status: "in_progress" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        meetingId: 2,
        description: "UIの最終確認",
        assignee: "デザイナー",
        dueDate: new Date("2024-12-04"),
        priority: "medium" as const,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  3: {
    transcript: {
      id: 3,
      meetingId: 3,
      fullText: `営業: 本日はお時間いただきありがとうございます。弊社のシステム導入についてご説明させていただきます。

顧客: よろしくお願いします。主に導入スケジュールとサポート体制について確認したいです。

営業: かしこまりました。導入は3フェーズで進めます。第1フェーズは初期設定で1週間、第2フェーズはデータ移行で2週間、第3フェーズは運用テストで1週間を予定しています。

顧客: トータル1ヶ月程度ですね。導入後のサポートはどうなりますか？

営業: 導入後3ヶ月間は専任のカスタマーサクセス担当が週次で定例MTGを実施します。その後も月次での定例MTGと24時間のメールサポートを提供します。

顧客: 分かりました。費用面について確認させてください。

営業: 初期導入費用が50万円、月額利用料が10万円となります。年間契約の場合は月額を8万円に割引可能です。

顧客: 検討して来週までに回答します。

営業: ありがとうございます。ご質問があればいつでもご連絡ください。`,
      vttContent: null,
      language: "ja",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    minutes: {
      id: 3,
      meetingId: 3,
      summary: "ABC株式会社へのシステム導入提案を実施。導入スケジュールと費用について説明しました。",
      keyPoints: JSON.stringify([
        "3フェーズでの導入（計1ヶ月）",
        "導入後3ヶ月は週次MTG実施",
        "24時間メールサポート提供",
        "初期費用50万円、月額10万円（年間契約で8万円）",
      ]),
      decisions: JSON.stringify([
        "来週までに導入可否を回答いただく",
      ]),
      candidateName: null,
      evaluationPoints: null,
      recommendation: null,
      lineMessage: null,
      generatedAt: new Date(),
      customPrompt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    actionItems: [
      {
        id: 4,
        meetingId: 3,
        description: "フォローアップメール送信",
        assignee: "営業担当",
        dueDate: new Date("2024-12-04"),
        priority: "high" as const,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
};

