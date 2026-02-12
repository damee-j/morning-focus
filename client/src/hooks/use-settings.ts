import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { SettingsPatchInput } from "@shared/routes";

function parseWithLogging<S extends z.ZodTypeAny>(schema: S, data: unknown, label: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error?.format?.() ?? result.error);
    throw result.error;
  }
  return result.data;
}

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("설정을 불러오지 못했어요.");
      const json = await res.json();
      return parseWithLogging(
        api.settings.get.responses[200],
        json,
        "settings.get[200]",
      );
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: SettingsPatchInput) => {
      const validated = api.settings.update.input.parse(patch);
      const res = await fetch(api.settings.update.path, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json();
          const err = parseWithLogging(
            api.settings.update.responses[400],
            errJson,
            "settings.update[400]",
          );
          throw new Error(err?.message ?? "설정을 저장하지 못했어요.");
        }
        throw new Error("설정을 저장하지 못했어요.");
      }

      const json = await res.json();
      return parseWithLogging(
        api.settings.update.responses[200],
        json,
        "settings.update[200]",
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
  });
}
