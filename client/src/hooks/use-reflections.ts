import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  ConfirmScheduleInput,
  PlanTaskInput,
  PreviewScheduleInput,
  ReflectionCreateInput,
  ToggleCompletedInput,
} from "@shared/routes";

function parseWithLogging<S extends z.ZodTypeAny>(schema: S, data: unknown, label: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error?.format?.() ?? result.error);
    throw result.error;
  }
  return result.data;
}

export function useReflections() {
  return useQuery({
    queryKey: [api.reflections.list.path],
    queryFn: async () => {
      const res = await fetch(api.reflections.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("기록을 불러오지 못했어요.");
      const json = await res.json();
      return parseWithLogging(
        api.reflections.list.responses[200],
        json,
        "reflections.list[200]",
      );
    },
  });
}

export function useStreak() {
  return useQuery({
    queryKey: [api.reflections.streak.path],
    queryFn: async () => {
      const res = await fetch(api.reflections.streak.path, { credentials: "include" });
      if (!res.ok) throw new Error("스트릭을 불러오지 못했어요.");
      const json = await res.json();
      return parseWithLogging(
        api.reflections.streak.responses[200],
        json,
        "reflections.streak[200]",
      );
    },
  });
}

export function useCreateReflection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReflectionCreateInput) => {
      const validated = api.reflections.create.input.parse(input);
      const res = await fetch(api.reflections.create.path, {
        method: api.reflections.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.create.responses[400],
            errJson,
            "reflections.create[400]",
          );
          throw new Error(err?.message ?? "회고를 저장하지 못했어요.");
        }
        throw new Error("회고를 저장하지 못했어요.");
      }

      const json = await res.json();
      return parseWithLogging(
        api.reflections.create.responses[201],
        json,
        "reflections.create[201]",
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.reflections.list.path] });
      await qc.invalidateQueries({ queryKey: [api.reflections.streak.path] });
    },
  });
}

export function usePlanTask(reflectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanTaskInput) => {
      const validated = api.reflections.planTask.input.parse(input);
      const url = buildUrl(api.reflections.planTask.path, { id: reflectionId });
      const res = await fetch(url, {
        method: api.reflections.planTask.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.planTask.responses[400],
            errJson,
            `reflections.planTask[400]`,
          );
          throw new Error(err?.message ?? "계획을 저장하지 못했어요.");
        }
        if (res.status === 404) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.planTask.responses[404],
            errJson,
            `reflections.planTask[404]`,
          );
          throw new Error(err?.message ?? "회고를 찾지 못했어요.");
        }
        throw new Error("AI 피드백을 받아오지 못했어요.");
      }

      const json = await res.json();
      return parseWithLogging(
        api.reflections.planTask.responses[200],
        json,
        "reflections.planTask[200]",
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.reflections.list.path] });
    },
  });
}

export function usePreviewSchedule(reflectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PreviewScheduleInput) => {
      const validated = api.reflections.previewSchedule.input.parse(input);
      const url = buildUrl(api.reflections.previewSchedule.path, { id: reflectionId });
      const res = await fetch(url, {
        method: api.reflections.previewSchedule.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.previewSchedule.responses[400],
            errJson,
            `reflections.previewSchedule[400]`,
          );
          throw new Error(err?.message ?? "일정을 미리보지 못했어요.");
        }
        if (res.status === 404) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.previewSchedule.responses[404],
            errJson,
            `reflections.previewSchedule[404]`,
          );
          throw new Error(err?.message ?? "회고를 찾지 못했어요.");
        }
        throw new Error("일정을 미리보지 못했어요.");
      }

      const json = await res.json();
      return parseWithLogging(
        api.reflections.previewSchedule.responses[200],
        json,
        "reflections.previewSchedule[200]",
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.reflections.list.path] });
    },
  });
}

export function useConfirmSchedule(reflectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConfirmScheduleInput) => {
      const validated = api.reflections.confirmSchedule.input.parse(input);
      const url = buildUrl(api.reflections.confirmSchedule.path, { id: reflectionId });
      const res = await fetch(url, {
        method: api.reflections.confirmSchedule.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.confirmSchedule.responses[400],
            errJson,
            `reflections.confirmSchedule[400]`,
          );
          throw new Error(err?.message ?? "일정을 저장하지 못했어요.");
        }
        if (res.status === 404) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.confirmSchedule.responses[404],
            errJson,
            `reflections.confirmSchedule[404]`,
          );
          throw new Error(err?.message ?? "회고를 찾지 못했어요.");
        }
        throw new Error("일정 확정을 완료하지 못했어요.");
      }

      const json = await res.json();
      return parseWithLogging(
        api.reflections.confirmSchedule.responses[200],
        json,
        "reflections.confirmSchedule[200]",
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.reflections.list.path] });
      await qc.invalidateQueries({ queryKey: [api.reflections.streak.path] });
    },
  });
}

export function useToggleCompleted(reflectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ToggleCompletedInput) => {
      const validated = api.reflections.toggleCompleted.input.parse(input);
      const url = buildUrl(api.reflections.toggleCompleted.path, { id: reflectionId });
      const res = await fetch(url, {
        method: api.reflections.toggleCompleted.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.toggleCompleted.responses[400],
            errJson,
            `reflections.toggleCompleted[400]`,
          );
          throw new Error(err?.message ?? "완료 상태를 저장하지 못했어요.");
        }
        if (res.status === 404) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.reflections.toggleCompleted.responses[404],
            errJson,
            `reflections.toggleCompleted[404]`,
          );
          throw new Error(err?.message ?? "회고를 찾지 못했어요.");
        }
        throw new Error("완료 상태를 바꾸지 못했어요.");
      }

      const json = await res.json();
      return parseWithLogging(
        api.reflections.toggleCompleted.responses[200],
        json,
        "reflections.toggleCompleted[200]",
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.reflections.list.path] });
      await qc.invalidateQueries({ queryKey: [api.reflections.streak.path] });
    },
  });
}
