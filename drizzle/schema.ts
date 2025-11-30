import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Meetings table - stores Zoom meeting/recording information
 */
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  // Zoom specific IDs
  zoomMeetingId: varchar("zoomMeetingId", { length: 64 }).notNull(),
  zoomRecordingId: varchar("zoomRecordingId", { length: 64 }),
  zoomUuid: varchar("zoomUuid", { length: 128 }),
  
  // Meeting metadata
  topic: text("topic"),
  hostId: varchar("hostId", { length: 64 }),
  hostEmail: varchar("hostEmail", { length: 320 }),
  startTime: timestamp("startTime"),
  duration: int("duration"), // in minutes
  
  // Recording URLs
  shareUrl: text("shareUrl"),
  downloadUrl: text("downloadUrl"),
  downloadToken: text("downloadToken"), // Valid for 24 hours
  
  // Processing status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  processingError: text("processingError"),
  
  // Meeting type classification
  meetingType: mysqlEnum("meetingType", [
    "unknown",
    "interview",           // 採用面接
    "internal_meeting",    // 社内会議
    "client_meeting",      // 取引先との打ち合わせ
    "one_on_one",          // 1on1
    "training",            // 研修・トレーニング
    "presentation",        // プレゼン・説明会
    "other"                // その他
  ]).default("unknown"),
  interviewStage: mysqlEnum("interviewStage", ["first", "second", "final", "other"]),
  meetingSubType: text("meetingSubType"), // サブタイプ(例: 定例会議、商談、進捗確認など)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

/**
 * Transcripts table - stores meeting transcripts
 */
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  
  // Transcript content
  fullText: text("fullText").notNull(),
  vttContent: text("vttContent"), // VTT format with timestamps
  
  // Metadata
  language: varchar("language", { length: 10 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = typeof transcripts.$inferInsert;

/**
 * Minutes table - stores generated meeting minutes
 */
export const minutes = mysqlTable("minutes", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  
  // Generated content
  summary: text("summary"),
  keyPoints: text("keyPoints"), // JSON array of key discussion points
  decisions: text("decisions"), // JSON array of decisions made
  
  // Interview-specific fields
  candidateName: text("candidateName"),
  evaluationPoints: text("evaluationPoints"), // JSON object with evaluation criteria
  recommendation: text("recommendation"),
  lineMessage: text("lineMessage"), // Generated LINE message for candidate
  
  // Metadata
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  customPrompt: text("customPrompt"), // User-customized prompt used for generation
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Minute = typeof minutes.$inferSelect;
export type InsertMinute = typeof minutes.$inferInsert;

/**
 * Action items table - stores extracted action items from meetings
 */
export const actionItems = mysqlTable("actionItems", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  
  // Action item details
  description: text("description").notNull(),
  assignee: text("assignee"),
  dueDate: timestamp("dueDate"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

/**
 * Prompt templates table - stores customizable prompts for AI processing
 */
export const promptTemplates = mysqlTable("promptTemplates", {
  id: int("id").autoincrement().primaryKey(),
  
  // Template identification
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["interview_first", "interview_second", "regular_meeting", "custom"]).notNull(),
  
  // Prompt content
  systemPrompt: text("systemPrompt").notNull(),
  userPromptTemplate: text("userPromptTemplate").notNull(),
  
  // Metadata
  isDefault: boolean("isDefault").default(false).notNull(),
  createdBy: int("createdBy"), // user ID
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;
