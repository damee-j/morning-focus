import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import { getUncachableGoogleCalendarClient, clearGoogleConnectionCache } from "./services/googleCalendar";
import {
  buildLarkAuthUrl,
  exchangeLarkCode,
  isLarkConnected,
  larkFreeBusy,
  larkCreateEvent,
  validateOAuthState,
} from "./services/larkCalendar";
import { buildSchedulePreview, buildWindowDates } from "./services/scheduler";
import {
  type PreviewScheduleBlock,
  type PreviewScheduleResponse,
} from "@shared/schema";
import { generatePlanWithAi } from "./services/ai";

function zod400(res: any, err: z.ZodError) {
  return res.status(400).json({
    message: err.errors[0]?.message ?? "Invalid request",
    field: err.errors[0]?.path?.join("."),
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get(api.calendar.status.path, async (_req, res) => {
    let googleConnected = false;
    let larkConnectedFlag = false;
    let larkHasCredentials = false;
    let googleDisabledByUser = false;

    try {
      const settings = await storage.getSettings();
      googleDisabledByUser = settings.googleDisabled === true;
      larkHasCredentials = !!(settings.larkAppId && settings.larkAppSecret);
    } catch {}

    if (!googleDisabledByUser) {
      try {
        await getUncachableGoogleCalendarClient();
        googleConnected = true;
      } catch {}
    }

    try {
      larkConnectedFlag = await isLarkConnected();
    } catch {}

    return res.json({
      google: { connected: googleConnected },
      lark: { connected: larkConnectedFlag, hasCredentials: larkHasCredentials },
    });
  });

  app.get(api.calendar.larkAuthUrl.path, async (_req, res) => {
    try {
      const url = await buildLarkAuthUrl();
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.calendar.larkCallback.path, async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      if (!code) {
        return res.status(400).send(`
          <html><body style="background:#0b1120;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div style="text-align:center"><h2>Lark 연동 실패</h2><p>인증 코드가 없어요. 다시 시도해 주세요.</p></div>
          </body></html>
        `);
      }

      if (!validateOAuthState(state)) {
        return res.status(400).send(`
          <html><body style="background:#0b1120;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div style="text-align:center"><h2>Lark 연동 실패</h2><p>유효하지 않은 인증 요청이에요. 다시 시도해 주세요.</p></div>
          </body></html>
        `);
      }

      await exchangeLarkCode(code);

      await storage.updateSettings({ calendarProvider: "lark" });

      res.send(`
        <html><body style="background:#0b1120;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
          <div style="text-align:center">
            <h2 style="color:#f59e0b;">Lark Calendar 연동 완료</h2>
            <p style="color:#94a3b8;">이 창을 닫고 Morning Focus로 돌아가세요.</p>
            <script>setTimeout(()=>window.close(),2000)</script>
          </div>
        </body></html>
      `);
    } catch (err: any) {
      console.error("Lark callback error:", err);
      res.status(500).send(`
        <html><body style="background:#0b1120;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
          <div style="text-align:center"><h2>Lark 연동 실패</h2><p>${err.message}</p></div>
        </body></html>
      `);
    }
  });

  app.post(api.calendar.googleDisconnect.path, async (_req, res) => {
    clearGoogleConnectionCache();
    await storage.updateSettings({ googleDisabled: true });
    res.json({ success: true });
  });

  app.post("/api/calendar/google/enable", async (_req, res) => {
    clearGoogleConnectionCache();
    await storage.updateSettings({ googleDisabled: false });
    res.json({ success: true });
  });

  app.post(api.calendar.larkDisconnect.path, async (_req, res) => {
    await storage.deleteLarkToken();
    res.json({ success: true });
  });

  app.post(api.calendar.larkCredentials.path, async (req, res) => {
    try {
      const body = api.calendar.larkCredentials.input.parse(req.body);
      await storage.updateSettings({
        larkAppId: body.larkAppId,
        larkAppSecret: body.larkAppSecret,
      });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  app.get(api.settings.get.path, async (_req, res) => {
    const settings = await storage.getSettings();
    const masked = {
      ...settings,
      larkAppSecret: settings.larkAppSecret ? "••••••••" : null,
    };
    res.json(masked);
  });

  app.patch(api.settings.update.path, async (req, res) => {
    try {
      const patch = api.settings.update.input.parse(req.body);
      const updated = await storage.updateSettings(patch);
      const masked = {
        ...updated,
        larkAppSecret: updated.larkAppSecret ? "••••••••" : null,
      };
      res.json(masked);
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  app.get(api.reflections.list.path, async (_req, res) => {
    const rows = await storage.listReflections();
    res.json(rows);
  });

  app.get(api.reflections.streak.path, async (_req, res) => {
    const rows = await storage.listReflections();
    const completedDates = rows
      .filter((r) => true)
      .map((r) => r.date)
      .sort()
      .reverse();

    if (completedDates.length === 0) {
      return res.json({ streak: 0 });
    }

    let streak = 0;
    let cursor = new Date(completedDates[0] + "T00:00:00Z");

    const set = new Set(completedDates);

    while (true) {
      const ymd = cursor.toISOString().slice(0, 10);
      if (!set.has(ymd)) break;
      streak++;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    }

    return res.json({ streak, latestDate: completedDates[0] });
  });

  app.post(api.reflections.create.path, async (req, res) => {
    try {
      const input = api.reflections.create.input.parse(req.body);
      const created = await storage.createReflection(input);
      res.status(201).json({ reflection: created });
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  app.post(api.reflections.planTask.path, async (req, res) => {
    try {
      const id = req.params.id;
      const body = api.reflections.planTask.input.parse(req.body);

      const reflection = await storage.getReflection(id);
      if (!reflection) {
        return res.status(404).json({ message: "Reflection not found" });
      }

      const recent = (await storage.listReflections()).slice(0, 3);
      const ai = await generatePlanWithAi({
        recentReflections: recent.map((r) => ({
          date: r.date,
          reflectionText: r.reflectionText,
          topTask: r.topTask,
        })),
        reflectionText: reflection.reflectionText,
        topTask: body.topTask,
      });

      const suggestedDurationMinutes = body.durationMinutes ?? ai.suggestedDurationMinutes;

      const updated = await storage.setPlannedTask(id, {
        topTask: body.topTask,
        aiFeedback: ai.aiFeedback,
        suggestedDurationMinutes,
      });

      res.json({
        reflection: updated,
        suggestedDurationMinutes,
        aiFeedback: ai.aiFeedback,
        followUpQuestion: ai.followUpQuestion,
      });
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  app.post(api.reflections.previewSchedule.path, async (req, res) => {
    try {
      const id = req.params.id;
      const body = api.reflections.previewSchedule.input.parse(req.body);

      const reflection = await storage.getReflection(id);
      if (!reflection) {
        return res.status(404).json({ message: "Reflection not found" });
      }

      const settings = await storage.getSettings();

      const schedulableHoursStart =
        body.schedulableHoursStart ?? settings.schedulableHoursStart;
      const schedulableHoursEnd = body.schedulableHoursEnd ?? settings.schedulableHoursEnd;

      const { windowStart, windowEnd } = buildWindowDates(
        body.scheduleDate,
        schedulableHoursStart,
        schedulableHoursEnd,
        -540,
      );

      let busySlots: Array<{ start: Date; end: Date }> = [];

      if (settings.calendarProvider === "lark") {
        busySlots = await larkFreeBusy(windowStart.toISOString(), windowEnd.toISOString());
      } else {
        const calendar = await getUncachableGoogleCalendarClient();
        const fb = await calendar.freebusy.query({
          requestBody: {
            timeMin: windowStart.toISOString(),
            timeMax: windowEnd.toISOString(),
            items: [{ id: "primary" }],
          },
        });
        const busy = fb.data.calendars?.primary?.busy ?? [];
        busySlots = busy
          .filter((b) => b.start && b.end)
          .map((b) => ({
            start: new Date(b.start as string),
            end: new Date(b.end as string),
          }));
      }

      const blocks = buildSchedulePreview({
        windowStart,
        windowEnd,
        durationMinutes: body.durationMinutes,
        busySlots,
        minBlockMinutes: 30,
      });

      const response: PreviewScheduleResponse = {
        provider: settings.calendarProvider,
        titleBase: reflection.topTask || "Focus",
        blocks,
      };

      res.json(response);
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  app.post(api.reflections.confirmSchedule.path, async (req, res) => {
    try {
      const id = req.params.id;
      const body = api.reflections.confirmSchedule.input.parse(req.body);

      const reflection = await storage.getReflection(id);
      if (!reflection) {
        return res.status(404).json({ message: "Reflection not found" });
      }

      const settings = await storage.getSettings();
      const titleBase = reflection.topTask || "Focus";

      const savedBlocks: Array<{
        calendarEventId: string;
        startTimeIso: string;
        endTimeIso: string;
        blockIndex: number;
        totalBlocks: number;
      }> = [];

      for (const b of body.blocks) {
        const isSplit = body.blocks.length > 1;
        const summary = isSplit
          ? `[Focus ${b.blockIndex}/${b.totalBlocks}] ${titleBase}`
          : `[Focus] ${titleBase}`;

        let eventId = "";

        if (settings.calendarProvider === "lark") {
          eventId = await larkCreateEvent({
            summary,
            description: "Auto-scheduled by Morning Focus",
            startTimeIso: b.startTimeIso,
            endTimeIso: b.endTimeIso,
          });
        } else {
          const calendar = await getUncachableGoogleCalendarClient();
          const created = await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
              summary,
              start: { dateTime: b.startTimeIso },
              end: { dateTime: b.endTimeIso },
              description: "Auto-scheduled by Morning Focus",
              colorId: "9",
            },
          });
          eventId = created.data.id || "";
        }

        savedBlocks.push({
          calendarEventId: eventId,
          startTimeIso: b.startTimeIso,
          endTimeIso: b.endTimeIso,
          blockIndex: b.blockIndex,
          totalBlocks: b.totalBlocks,
        });
      }

      const stored = await storage.saveScheduledBlocks(id, savedBlocks);
      const updated = await storage.getReflection(id);

      res.json({
        reflection: updated!,
        savedBlocks: stored,
      });
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  app.patch(api.reflections.toggleCompleted.path, async (req, res) => {
    try {
      const id = req.params.id;
      const body = api.reflections.toggleCompleted.input.parse(req.body);
      const reflection = await storage.getReflection(id);
      if (!reflection) {
        return res.status(404).json({ message: "Reflection not found" });
      }

      const updated = await storage.toggleCompleted(id, body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return zod400(res, err);
      throw err;
    }
  });

  return httpServer;
}
