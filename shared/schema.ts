import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

// =====================================================
// Core domain: settings + reflections + scheduled blocks
// =====================================================

export const calendarProviderEnum = pgEnum("calendar_provider", [
  "google",
  "lark",
]);

export const languageEnum = pgEnum("language", ["ko", "en"]);

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),

  notificationTime: varchar("notification_time", { length: 5 })
    .notNull()
    .default("21:00"),

  calendarProvider: calendarProviderEnum("calendar_provider")
    .notNull()
    .default("google"),

  schedulableHoursStart: integer("schedulable_hours_start")
    .notNull()
    .default(9),

  schedulableHoursEnd: integer("schedulable_hours_end").notNull().default(19),

  language: languageEnum("language").notNull().default("ko"),

  larkAppId: text("lark_app_id"),
  larkAppSecret: text("lark_app_secret"),

  googleDisabled: boolean("google_disabled").notNull().default(false),
});

export const reflections = pgTable("reflections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD

  reflectionText: text("reflection_text").notNull(),

  aiFeedback: text("ai_feedback").notNull(),

  topTask: text("top_task").notNull(),

  estimatedDurationMinutes: integer("estimated_duration_minutes")
    .notNull()
    .default(60),

  completed: boolean("completed").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduledBlocks = pgTable("scheduled_blocks", {
  id: serial("id").primaryKey(),

  reflectionId: varchar("reflection_id")
    .notNull()
    .references(() => reflections.id, { onDelete: "cascade" }),

  calendarEventId: text("calendar_event_id").notNull(),

  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),

  blockIndex: integer("block_index").notNull(),
  totalBlocks: integer("total_blocks").notNull(),
});

// Optional: small audit row for last calendar sync state
export const calendarProfiles = pgTable("calendar_profiles", {
  id: serial("id").primaryKey(),
  provider: calendarProviderEnum("provider").notNull(),

  // Google: primary
  // Lark: calendar_id (when implemented)
  calendarId: text("calendar_id"),

  // When we last fetched free/busy (for debugging)
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

export const larkTokens = pgTable("lark_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }).notNull(),
  openId: text("open_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// =====================================================
// Zod schemas (insert)
// =====================================================

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
});

export const insertReflectionSchema = createInsertSchema(reflections).omit({
  createdAt: true,
});

export const insertScheduledBlockSchema = createInsertSchema(scheduledBlocks).omit(
  {
    id: true,
  },
);

export const insertCalendarProfileSchema = createInsertSchema(calendarProfiles).omit(
  {
    id: true,
  },
);

// =====================================================
// Types
// =====================================================

export type CalendarProvider = (typeof calendarProviderEnum.enumValues)[number];
export type Language = (typeof languageEnum.enumValues)[number];

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type Reflection = typeof reflections.$inferSelect;
export type InsertReflection = z.infer<typeof insertReflectionSchema>;

export type ScheduledBlock = typeof scheduledBlocks.$inferSelect;
export type InsertScheduledBlock = z.infer<typeof insertScheduledBlockSchema>;

export type CalendarProfile = typeof calendarProfiles.$inferSelect;
export type InsertCalendarProfile = z.infer<typeof insertCalendarProfileSchema>;

export type LarkToken = typeof larkTokens.$inferSelect;

// =====================================================
// Explicit API contract types
// =====================================================

export type GetSettingsResponse = UserSettings;
export type UpdateSettingsRequest = Partial<InsertUserSettings>;
export type UpdateSettingsResponse = UserSettings;

export type CreateReflectionRequest = {
  date: string; // YYYY-MM-DD
  reflectionText: string;
};

export type CreateReflectionResponse = {
  reflection: Reflection;
};

export type PlanTaskRequest = {
  reflectionId: string;
  topTask: string;
  // If user picked one of presets or typed a number
  durationMinutes?: number;
};

export type PlanTaskResponse = {
  reflection: Reflection;
  // If AI suggested a duration, we return it even if durationMinutes omitted
  suggestedDurationMinutes: number;
  aiFeedback: string;
  followUpQuestion: string;
};

export type PreviewScheduleRequest = {
  reflectionId: string;
  durationMinutes: number;
  // YYYY-MM-DD for the day we schedule (usually tomorrow)
  scheduleDate: string;
  schedulableHoursStart?: number;
  schedulableHoursEnd?: number;
};

export type PreviewScheduleBlock = {
  startTimeIso: string;
  endTimeIso: string;
  blockIndex: number;
  totalBlocks: number;
};

export type PreviewScheduleResponse = {
  provider: CalendarProvider;
  titleBase: string;
  blocks: PreviewScheduleBlock[];
};

export type ConfirmScheduleRequest = {
  reflectionId: string;
  blocks: PreviewScheduleBlock[];
};

export type ConfirmScheduleResponse = {
  reflection: Reflection;
  savedBlocks: ScheduledBlock[];
};

export type ReflectionHistoryItem = Reflection & {
  blocks: ScheduledBlock[];
};

export type ListReflectionsResponse = ReflectionHistoryItem[];

export type ToggleCompletedRequest = { completed: boolean };
export type ToggleCompletedResponse = Reflection;

export type StreakResponse = { streak: number; latestDate?: string };

// =====================================================
// Shared helper schemas
// =====================================================

export const ymdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
