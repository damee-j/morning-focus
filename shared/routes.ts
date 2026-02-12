import { z } from "zod";
import {
  calendarProviderEnum,
  insertUserSettingsSchema,
  ymdSchema,
  type CalendarProvider,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
} as const;

const calendarProviderSchema = z.enum(["google", "lark"]);

export const api = {
  settings: {
    get: {
      method: "GET" as const,
      path: "/api/settings" as const,
      responses: {
        200: insertUserSettingsSchema.extend({ id: z.number().int().positive() }),
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/settings" as const,
      input: insertUserSettingsSchema.partial(),
      responses: {
        200: insertUserSettingsSchema.extend({ id: z.number().int().positive() }),
        400: errorSchemas.validation,
      },
    },
  },

  reflections: {
    list: {
      method: "GET" as const,
      path: "/api/reflections" as const,
      responses: {
        200: z.array(
          z.object({
            id: z.string(),
            date: ymdSchema,
            reflectionText: z.string(),
            aiFeedback: z.string(),
            topTask: z.string(),
            estimatedDurationMinutes: z.number().int(),
            completed: z.boolean(),
            createdAt: z.string(),
            blocks: z.array(
              z.object({
                id: z.number().int(),
                reflectionId: z.string(),
                calendarEventId: z.string(),
                startTime: z.string(),
                endTime: z.string(),
                blockIndex: z.number().int(),
                totalBlocks: z.number().int(),
              }),
            ),
          }),
        ),
      },
    },
    streak: {
      method: "GET" as const,
      path: "/api/reflections/streak" as const,
      responses: {
        200: z.object({
          streak: z.number().int().nonnegative(),
          latestDate: ymdSchema.optional(),
        }),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/reflections" as const,
      input: z.object({
        date: ymdSchema,
        reflectionText: z.string().min(1),
      }),
      responses: {
        201: z.object({
          reflection: z.object({
            id: z.string(),
            date: ymdSchema,
            reflectionText: z.string(),
            aiFeedback: z.string(),
            topTask: z.string(),
            estimatedDurationMinutes: z.number().int(),
            completed: z.boolean(),
            createdAt: z.string(),
          }),
        }),
        400: errorSchemas.validation,
      },
    },
    planTask: {
      method: "POST" as const,
      path: "/api/reflections/:id/plan" as const,
      input: z.object({
        topTask: z.string().min(1),
        durationMinutes: z.number().int().positive().optional(),
      }),
      responses: {
        200: z.object({
          reflection: z.object({
            id: z.string(),
            date: ymdSchema,
            reflectionText: z.string(),
            aiFeedback: z.string(),
            topTask: z.string(),
            estimatedDurationMinutes: z.number().int(),
            completed: z.boolean(),
            createdAt: z.string(),
          }),
          suggestedDurationMinutes: z.number().int().positive(),
          aiFeedback: z.string(),
          followUpQuestion: z.string(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    previewSchedule: {
      method: "POST" as const,
      path: "/api/reflections/:id/schedule/preview" as const,
      input: z.object({
        scheduleDate: ymdSchema,
        durationMinutes: z.number().int().positive(),
        schedulableHoursStart: z.number().int().min(0).max(23).optional(),
        schedulableHoursEnd: z.number().int().min(1).max(24).optional(),
      }),
      responses: {
        200: z.object({
          provider: z.enum(calendarProviderEnum.enumValues as ["google" | "lark", ...("google" | "lark")[]]),
          titleBase: z.string(),
          blocks: z.array(
            z.object({
              startTimeIso: z.string().datetime(),
              endTimeIso: z.string().datetime(),
              blockIndex: z.number().int().positive(),
              totalBlocks: z.number().int().positive(),
            }),
          ),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    confirmSchedule: {
      method: "POST" as const,
      path: "/api/reflections/:id/schedule/confirm" as const,
      input: z.object({
        blocks: z
          .array(
            z.object({
              startTimeIso: z.string().datetime(),
              endTimeIso: z.string().datetime(),
              blockIndex: z.number().int().positive(),
              totalBlocks: z.number().int().positive(),
            }),
          )
          .min(1),
      }),
      responses: {
        200: z.object({
          reflection: z.object({
            id: z.string(),
            date: ymdSchema,
            reflectionText: z.string(),
            aiFeedback: z.string(),
            topTask: z.string(),
            estimatedDurationMinutes: z.number().int(),
            completed: z.boolean(),
            createdAt: z.string(),
          }),
          savedBlocks: z.array(
            z.object({
              id: z.number().int(),
              reflectionId: z.string(),
              calendarEventId: z.string(),
              startTime: z.string(),
              endTime: z.string(),
              blockIndex: z.number().int(),
              totalBlocks: z.number().int(),
            }),
          ),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    toggleCompleted: {
      method: "PATCH" as const,
      path: "/api/reflections/:id/completed" as const,
      input: z.object({ completed: z.boolean() }),
      responses: {
        200: z.object({
          id: z.string(),
          date: ymdSchema,
          reflectionText: z.string(),
          aiFeedback: z.string(),
          topTask: z.string(),
          estimatedDurationMinutes: z.number().int(),
          completed: z.boolean(),
          createdAt: z.string(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },

  calendar: {
    status: {
      method: "GET" as const,
      path: "/api/calendar/status" as const,
      responses: {
        200: z.object({
          google: z.object({ connected: z.boolean() }),
          lark: z.object({ connected: z.boolean(), hasCredentials: z.boolean().optional() }),
        }),
      },
    },
    larkAuthUrl: {
      method: "GET" as const,
      path: "/api/calendar/lark/auth-url" as const,
      responses: {
        200: z.object({ url: z.string() }),
      },
    },
    larkCallback: {
      method: "GET" as const,
      path: "/api/calendar/lark/callback" as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    googleDisconnect: {
      method: "POST" as const,
      path: "/api/calendar/google/disconnect" as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    larkDisconnect: {
      method: "POST" as const,
      path: "/api/calendar/lark/disconnect" as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    larkCredentials: {
      method: "POST" as const,
      path: "/api/calendar/lark/credentials" as const,
      input: z.object({
        larkAppId: z.string().min(1),
        larkAppSecret: z.string().min(1),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
} as const;

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }
  return url;
}

export type SettingsPatchInput = z.infer<typeof api.settings.update.input>;
export type ReflectionCreateInput = z.infer<typeof api.reflections.create.input>;
export type PlanTaskInput = z.infer<typeof api.reflections.planTask.input>;
export type PreviewScheduleInput = z.infer<
  typeof api.reflections.previewSchedule.input
>;
export type ConfirmScheduleInput = z.infer<
  typeof api.reflections.confirmSchedule.input
>;
export type ToggleCompletedInput = z.infer<
  typeof api.reflections.toggleCompleted.input
>;
