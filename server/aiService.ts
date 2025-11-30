import { invokeLLM } from './_core/llm';
import { getDb } from './db';
import { meetings, transcripts, minutes, actionItems, promptTemplates } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Meeting Type Classification Result
 */
export interface MeetingTypeResult {
  meetingType: 'interview' | 'regular';
  interviewStage?: 'first' | 'second' | 'final' | 'other';
  confidence: number;
  reasoning: string;
}

/**
 * Interview Minutes Result
 */
export interface InterviewMinutesResult {
  candidateName: string;
  summary: string;
  evaluationPoints: {
    technical: string;
    communication: string;
    motivation: string;
    cultural_fit: string;
    overall: string;
  };
  recommendation: string;
  lineMessage: string;
}

/**
 * Regular Meeting Minutes Result
 */
export interface RegularMinutesResult {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{
    description: string;
    assignee?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Classify meeting type from transcript
 */
export async function classifyMeetingType(transcriptText: string): Promise<MeetingTypeResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `あなたは会議の種類を分類する専門家です。文字起こしテキストから、これが採用面接か通常の会議かを判断してください。

採用面接の場合は、さらに以下のステージを判定してください:
- first: 一次面接(カジュアル面談、初回スクリーニング)
- second: 二次面接(技術面接、詳細評価)
- final: 最終面接(役員面接、オファー前)
- other: その他の面接

JSON形式で以下の構造で回答してください:
{
  "meetingType": "interview" | "regular",
  "interviewStage": "first" | "second" | "final" | "other" (面接の場合のみ),
  "confidence": 0-100の数値,
  "reasoning": "判断理由"
}`,
      },
      {
        role: 'user',
        content: `以下の会議の文字起こしテキストを分析してください:\n\n${transcriptText.substring(0, 3000)}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'meeting_classification',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            meetingType: {
              type: 'string',
              enum: ['interview', 'regular'],
              description: '会議の種類',
            },
            interviewStage: {
              type: 'string',
              enum: ['first', 'second', 'final', 'other'],
              description: '面接のステージ(面接の場合のみ)',
            },
            confidence: {
              type: 'number',
              description: '判定の信頼度(0-100)',
            },
            reasoning: {
              type: 'string',
              description: '判断理由',
            },
          },
          required: ['meetingType', 'confidence', 'reasoning'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const result = JSON.parse(typeof content === 'string' ? content : '{}');
  return result as MeetingTypeResult;
}

/**
 * Generate interview minutes
 */
export async function generateInterviewMinutes(
  transcriptText: string,
  interviewStage: string,
  customPrompt?: string
): Promise<InterviewMinutesResult> {
  const systemPrompt = customPrompt || `あなたは採用面接の議事録を作成する専門家です。
文字起こしテキストから以下の情報を抽出・生成してください:

1. 候補者名
2. 面接の要約
3. 評価ポイント(技術力、コミュニケーション能力、モチベーション、カルチャーフィット、総合評価)
4. 推薦度と理由
5. 候補者に送るLINEメッセージ(丁寧で前向きな内容)

面接ステージ: ${interviewStage}`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `以下の面接の文字起こしテキストから議事録を作成してください:\n\n${transcriptText}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'interview_minutes',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            candidateName: { type: 'string' },
            summary: { type: 'string' },
            evaluationPoints: {
              type: 'object',
              properties: {
                technical: { type: 'string' },
                communication: { type: 'string' },
                motivation: { type: 'string' },
                cultural_fit: { type: 'string' },
                overall: { type: 'string' },
              },
              required: ['technical', 'communication', 'motivation', 'cultural_fit', 'overall'],
              additionalProperties: false,
            },
            recommendation: { type: 'string' },
            lineMessage: { type: 'string' },
          },
          required: ['candidateName', 'summary', 'evaluationPoints', 'recommendation', 'lineMessage'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const result = JSON.parse(typeof content === 'string' ? content : '{}');
  return result as InterviewMinutesResult;
}

/**
 * Generate regular meeting minutes
 */
export async function generateRegularMinutes(
  transcriptText: string,
  customPrompt?: string
): Promise<RegularMinutesResult> {
  const systemPrompt = customPrompt || `あなたは会議の議事録を作成する専門家です。
文字起こしテキストから以下の情報を抽出・生成してください:

1. 会議の要約
2. 主要な議論ポイント
3. 決定事項
4. アクションアイテム(担当者、期限、優先度を含む)`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `以下の会議の文字起こしテキストから議事録を作成してください:\n\n${transcriptText}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'meeting_minutes',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            keyPoints: {
              type: 'array',
              items: { type: 'string' },
            },
            decisions: {
              type: 'array',
              items: { type: 'string' },
            },
            actionItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  assignee: { type: 'string' },
                  dueDate: { type: 'string' },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                  },
                },
                required: ['description', 'priority'],
                additionalProperties: false,
              },
            },
          },
          required: ['summary', 'keyPoints', 'decisions', 'actionItems'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const result = JSON.parse(typeof content === 'string' ? content : '{}');
  return result as RegularMinutesResult;
}

/**
 * Process transcript with AI and save results
 */
export async function processTranscriptWithAI(meetingId: number, customPromptId?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // Get meeting and transcript
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.meetingId, meetingId)).limit(1);
    if (!transcript) {
      throw new Error('Transcript not found');
    }

    // Get custom prompt if specified
    let customPrompt: string | undefined;
    if (customPromptId) {
      const [promptTemplate] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, customPromptId)).limit(1);
      if (promptTemplate) {
        customPrompt = promptTemplate.systemPrompt;
      }
    }

    console.log('[AI Service] Classifying meeting type...');
    // Classify meeting type
    const classification = await classifyMeetingType(transcript.fullText);

    // Update meeting with classification
    await db
      .update(meetings)
      .set({
        meetingType: classification.meetingType,
        interviewStage: classification.interviewStage || null,
      })
      .where(eq(meetings.id, meetingId));

    console.log('[AI Service] Generating minutes...');
    // Generate minutes based on type
    if (classification.meetingType === 'interview') {
      const interviewMinutes = await generateInterviewMinutes(
        transcript.fullText,
        classification.interviewStage || 'other',
        customPrompt
      );

      // Save interview minutes
      await db.insert(minutes).values({
        meetingId,
        summary: interviewMinutes.summary,
        keyPoints: JSON.stringify([]),
        decisions: JSON.stringify([]),
        candidateName: interviewMinutes.candidateName,
        evaluationPoints: JSON.stringify(interviewMinutes.evaluationPoints),
        recommendation: interviewMinutes.recommendation,
        lineMessage: interviewMinutes.lineMessage,
        customPrompt: customPrompt || null,
      });
    } else {
      const regularMinutes = await generateRegularMinutes(transcript.fullText, customPrompt);

      // Save regular meeting minutes
      await db.insert(minutes).values({
        meetingId,
        summary: regularMinutes.summary,
        keyPoints: JSON.stringify(regularMinutes.keyPoints),
        decisions: JSON.stringify(regularMinutes.decisions),
        customPrompt: customPrompt || null,
      });

      // Save action items
      for (const item of regularMinutes.actionItems) {
        await db.insert(actionItems).values({
          meetingId,
          description: item.description,
          assignee: item.assignee || null,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          priority: item.priority,
        });
      }
    }

    // Update meeting status to completed
    await db
      .update(meetings)
      .set({ status: 'completed' })
      .where(eq(meetings.id, meetingId));

    console.log('[AI Service] Processing completed successfully');
  } catch (error: any) {
    console.error('[AI Service] Error processing transcript:', error);

    // Update meeting status to failed
    await db
      .update(meetings)
      .set({
        status: 'failed',
        processingError: error.message || 'AI processing failed',
      })
      .where(eq(meetings.id, meetingId));

    throw error;
  }
}
