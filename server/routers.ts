import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { meetings, transcripts, minutes, actionItems, promptTemplates } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { processTranscriptWithAI } from "./aiService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  meetings: router({
    // Get all meetings
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(meetings)
        .orderBy(desc(meetings.startTime));

      return result;
    }),

    // Get meeting by ID with full details
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [meeting] = await db
          .select()
          .from(meetings)
          .where(eq(meetings.id, input.id))
          .limit(1);

        if (!meeting) return null;

        // Get transcript
        const [transcript] = await db
          .select()
          .from(transcripts)
          .where(eq(transcripts.meetingId, input.id))
          .limit(1);

        // Get minutes
        const [minute] = await db
          .select()
          .from(minutes)
          .where(eq(minutes.meetingId, input.id))
          .limit(1);

        // Get action items
        const actions = await db
          .select()
          .from(actionItems)
          .where(eq(actionItems.meetingId, input.id));

        return {
          meeting,
          transcript,
          minutes: minute,
          actionItems: actions,
        };
      }),

    // Reprocess meeting with optional custom prompt
    reprocess: protectedProcedure
      .input(
        z.object({
          meetingId: z.number(),
          customPromptId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Update status to processing
        await db
          .update(meetings)
          .set({ status: 'processing' })
          .where(eq(meetings.id, input.meetingId));

        // Delete existing minutes and action items
        await db.delete(minutes).where(eq(minutes.meetingId, input.meetingId));
        await db.delete(actionItems).where(eq(actionItems.meetingId, input.meetingId));

        // Reprocess with AI
        await processTranscriptWithAI(input.meetingId, input.customPromptId);

        return { success: true };
      }),
  }),

  prompts: router({
    // Get all prompt templates
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db.select().from(promptTemplates);
      return result;
    }),

    // Get prompt by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [prompt] = await db
          .select()
          .from(promptTemplates)
          .where(eq(promptTemplates.id, input.id))
          .limit(1);

        return prompt;
      }),

    // Create new prompt template
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum(['interview_first', 'interview_second', 'regular_meeting', 'custom']),
          systemPrompt: z.string(),
          userPromptTemplate: z.string(),
          isDefault: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const result = await db.insert(promptTemplates).values({
          ...input,
          createdBy: ctx.user?.id || null,
        });

        return { id: result[0].insertId };
      }),

    // Update prompt template
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          systemPrompt: z.string().optional(),
          userPromptTemplate: z.string().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { id, ...updateData } = input;
        await db
          .update(promptTemplates)
          .set(updateData)
          .where(eq(promptTemplates.id, id));

        return { success: true };
      }),

    // Delete prompt template
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db.delete(promptTemplates).where(eq(promptTemplates.id, input.id));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
