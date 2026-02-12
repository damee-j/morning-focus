import { and, desc, eq } from "drizzle-orm";
import {
  larkTokens,
  reflections,
  scheduledBlocks,
  userSettings,
  type CreateReflectionRequest,
  type GetSettingsResponse,
  type LarkToken,
  type ListReflectionsResponse,
  type PreviewScheduleBlock,
  type ScheduledBlock,
  type ToggleCompletedRequest,
  type UpdateSettingsRequest,
} from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  getSettings(): Promise<GetSettingsResponse>;
  updateSettings(patch: UpdateSettingsRequest): Promise<GetSettingsResponse>;

  listReflections(): Promise<ListReflectionsResponse>;
  getReflection(id: string): Promise<(typeof reflections.$inferSelect) | undefined>;
  createReflection(input: CreateReflectionRequest): Promise<(typeof reflections.$inferSelect)>;

  setPlannedTask(
    reflectionId: string,
    input: { topTask: string; aiFeedback: string; suggestedDurationMinutes: number },
  ): Promise<(typeof reflections.$inferSelect)>;

  setDuration(
    reflectionId: string,
    durationMinutes: number,
  ): Promise<(typeof reflections.$inferSelect)>;

  saveScheduledBlocks(
    reflectionId: string,
    blocks: Array<{
      calendarEventId: string;
      startTimeIso: string;
      endTimeIso: string;
      blockIndex: number;
      totalBlocks: number;
    }>,
  ): Promise<ScheduledBlock[]>;

  toggleCompleted(
    reflectionId: string,
    input: ToggleCompletedRequest,
  ): Promise<(typeof reflections.$inferSelect)>;

  getLarkToken(): Promise<LarkToken | undefined>;
  saveLarkToken(token: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
    openId?: string;
  }): Promise<LarkToken>;
  deleteLarkToken(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSettings(): Promise<GetSettingsResponse> {
    const [row] = await db.select().from(userSettings).limit(1);
    if (row) return row;

    const [created] = await db
      .insert(userSettings)
      .values({})
      .returning();
    return created;
  }

  async updateSettings(patch: UpdateSettingsRequest): Promise<GetSettingsResponse> {
    const current = await this.getSettings();
    const [updated] = await db
      .update(userSettings)
      .set({ ...patch })
      .where(eq(userSettings.id, current.id))
      .returning();
    return updated;
  }

  async listReflections(): Promise<ListReflectionsResponse> {
    const rows = await db
      .select()
      .from(reflections)
      .orderBy(desc(reflections.date));

    const ids = rows.map((r) => r.id);
    const blocks = ids.length
      ? await db
          .select()
          .from(scheduledBlocks)
          .where(
            // drizzle doesn't have inArray imported here; do per reflection later
            // we'll attach by filtering in-memory
            // keep query simple for small MVP
            and(eq(scheduledBlocks.reflectionId, ids[0])),
          )
      : [];

    // Because the above query only fetched for first id, do N queries safely (MVP scale)
    const blocksByReflection: Record<string, ScheduledBlock[]> = {};
    for (const r of rows) {
      const rBlocks = await db
        .select()
        .from(scheduledBlocks)
        .where(eq(scheduledBlocks.reflectionId, r.id))
        .orderBy(scheduledBlocks.blockIndex);
      blocksByReflection[r.id] = rBlocks;
    }

    return rows.map((r) => ({
      ...r,
      blocks: blocksByReflection[r.id] ?? [],
    }));
  }

  async getReflection(id: string) {
    const [row] = await db.select().from(reflections).where(eq(reflections.id, id));
    return row;
  }

  async createReflection(input: CreateReflectionRequest) {
    const [created] = await db
      .insert(reflections)
      .values({
        date: input.date,
        reflectionText: input.reflectionText,
        aiFeedback: "",
        topTask: "",
        estimatedDurationMinutes: 60,
        completed: false,
      })
      .onConflictDoUpdate({
        target: reflections.date,
        set: {
          reflectionText: input.reflectionText,
        },
      })
      .returning();

    return created;
  }

  async setPlannedTask(
    reflectionId: string,
    input: { topTask: string; aiFeedback: string; suggestedDurationMinutes: number },
  ) {
    const [updated] = await db
      .update(reflections)
      .set({
        topTask: input.topTask,
        aiFeedback: input.aiFeedback,
        estimatedDurationMinutes: input.suggestedDurationMinutes,
      })
      .where(eq(reflections.id, reflectionId))
      .returning();
    return updated;
  }

  async setDuration(reflectionId: string, durationMinutes: number) {
    const [updated] = await db
      .update(reflections)
      .set({ estimatedDurationMinutes: durationMinutes })
      .where(eq(reflections.id, reflectionId))
      .returning();
    return updated;
  }

  async saveScheduledBlocks(
    reflectionId: string,
    blocks: Array<{
      calendarEventId: string;
      startTimeIso: string;
      endTimeIso: string;
      blockIndex: number;
      totalBlocks: number;
    }>,
  ): Promise<ScheduledBlock[]> {
    // delete existing blocks for this reflection
    await db.delete(scheduledBlocks).where(eq(scheduledBlocks.reflectionId, reflectionId));

    const inserted: ScheduledBlock[] = [];
    for (const b of blocks) {
      const [row] = await db
        .insert(scheduledBlocks)
        .values({
          reflectionId,
          calendarEventId: b.calendarEventId,
          startTime: new Date(b.startTimeIso),
          endTime: new Date(b.endTimeIso),
          blockIndex: b.blockIndex,
          totalBlocks: b.totalBlocks,
        })
        .returning();
      inserted.push(row);
    }
    return inserted;
  }

  async toggleCompleted(reflectionId: string, input: ToggleCompletedRequest) {
    const [updated] = await db
      .update(reflections)
      .set({ completed: input.completed })
      .where(eq(reflections.id, reflectionId))
      .returning();
    return updated;
  }

  async getLarkToken(): Promise<LarkToken | undefined> {
    const [row] = await db.select().from(larkTokens).limit(1);
    return row;
  }

  async saveLarkToken(token: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
    openId?: string;
  }): Promise<LarkToken> {
    await db.delete(larkTokens);
    const [row] = await db
      .insert(larkTokens)
      .values({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        refreshExpiresAt: token.refreshExpiresAt,
        openId: token.openId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async deleteLarkToken(): Promise<void> {
    await db.delete(larkTokens);
  }
}

export const storage = new DatabaseStorage();
