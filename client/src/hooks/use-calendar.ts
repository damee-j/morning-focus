import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";

function parseWithLogging<S extends z.ZodTypeAny>(schema: S, data: unknown, label: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error?.format?.() ?? result.error);
    throw result.error;
  }
  return result.data;
}

export function useCalendarStatus() {
  return useQuery({
    queryKey: [api.calendar.status.path],
    queryFn: async () => {
      const res = await fetch(api.calendar.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("캘린더 연결 상태를 불러오지 못했어요.");
      const json = await res.json();
      return parseWithLogging(
        api.calendar.status.responses[200],
        json,
        "calendar.status[200]",
      );
    },
  });
}

export function useGoogleDisconnect() {
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", api.calendar.googleDisconnect.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calendar.status.path] });
    },
  });
}

export function useLarkDisconnect() {
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", api.calendar.larkDisconnect.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calendar.status.path] });
    },
  });
}

export function useLarkSaveCredentials() {
  return useMutation({
    mutationFn: async (data: { larkAppId: string; larkAppSecret: string }) => {
      await apiRequest("POST", api.calendar.larkCredentials.path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calendar.status.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}
