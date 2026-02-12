import crypto from "crypto";
import { storage } from "../storage";

const LARK_BASE_URL = "https://open.larksuite.com";
const LARK_AUTH_URL = `${LARK_BASE_URL}/open-apis/authen/v1/authorize`;
const LARK_TOKEN_URL = `${LARK_BASE_URL}/open-apis/authen/v1/oidc/access_token`;
const LARK_REFRESH_URL = `${LARK_BASE_URL}/open-apis/authen/v1/oidc/refresh_access_token`;
const LARK_FREEBUSY_URL = `${LARK_BASE_URL}/open-apis/calendar/v4/freebusy/list`;
const LARK_EVENTS_URL = `${LARK_BASE_URL}/open-apis/calendar/v4/calendars`;

let pendingOAuthState: string | null = null;

async function getLarkCredentials(): Promise<{ appId: string; appSecret: string }> {
  const settings = await storage.getSettings();
  const appId = settings.larkAppId || process.env.LARK_APP_ID;
  const appSecret = settings.larkAppSecret || process.env.LARK_APP_SECRET;
  if (!appId) throw new Error("Lark App ID가 설정되지 않았어요. 설정 페이지에서 입력해 주세요.");
  if (!appSecret) throw new Error("Lark App Secret이 설정되지 않았어요. 설정 페이지에서 입력해 주세요.");
  return { appId, appSecret };
}

function getRedirectUri(): string {
  const host = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DEPLOYMENT_URL
      ? process.env.REPLIT_DEPLOYMENT_URL
      : "http://localhost:5000";
  return `${host}/api/calendar/lark/callback`;
}

export async function buildLarkAuthUrl(): Promise<string> {
  const { appId } = await getLarkCredentials();
  const redirectUri = getRedirectUri();
  pendingOAuthState = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    scope: "calendar:calendar offline_access",
    state: pendingOAuthState,
  });
  return `${LARK_AUTH_URL}?${params.toString()}`;
}

export function validateOAuthState(state: string): boolean {
  if (!pendingOAuthState || state !== pendingOAuthState) return false;
  pendingOAuthState = null;
  return true;
}

export async function exchangeLarkCode(code: string): Promise<void> {
  const { appId, appSecret } = await getLarkCredentials();
  const redirectUri = getRedirectUri();

  const resp = await fetch(LARK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await resp.json();

  if (!resp.ok || data.code !== 0) {
    console.error("Lark token exchange failed:", data);
    throw new Error(data.msg || "Failed to exchange Lark authorization code");
  }

  const tokenData = data.data;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const refreshExpiresAt = new Date(Date.now() + tokenData.refresh_expires_in * 1000);

  await storage.saveLarkToken({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    refreshExpiresAt,
    openId: tokenData.open_id,
  });
}

async function getValidAccessToken(): Promise<string> {
  const token = await storage.getLarkToken();
  if (!token) throw new Error("Lark Calendar not connected");

  if (token.expiresAt > new Date(Date.now() + 60_000)) {
    return token.accessToken;
  }

  if (token.refreshExpiresAt < new Date()) {
    await storage.deleteLarkToken();
    throw new Error("Lark refresh token expired — please reconnect");
  }

  const { appId, appSecret } = await getLarkCredentials();

  const resp = await fetch(LARK_REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: appSecret,
      refresh_token: token.refreshToken,
    }),
  });

  const data = await resp.json();

  if (!resp.ok || data.code !== 0) {
    console.error("Lark token refresh failed:", data);
    throw new Error("Failed to refresh Lark token");
  }

  const tokenData = data.data;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const refreshExpiresAt = new Date(Date.now() + tokenData.refresh_expires_in * 1000);

  const saved = await storage.saveLarkToken({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    refreshExpiresAt,
    openId: tokenData.open_id ?? token.openId ?? undefined,
  });

  return saved.accessToken;
}

export async function isLarkConnected(): Promise<boolean> {
  try {
    const token = await storage.getLarkToken();
    if (!token) return false;
    if (token.refreshExpiresAt < new Date()) {
      await storage.deleteLarkToken();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function larkFreeBusy(
  timeMin: string,
  timeMax: string,
): Promise<Array<{ start: Date; end: Date }>> {
  const accessToken = await getValidAccessToken();

  const token = await storage.getLarkToken();
  const openId = token?.openId;

  const resp = await fetch(LARK_FREEBUSY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      time_min: timeMin,
      time_max: timeMax,
      ...(openId ? { user_id: { user_id: openId, user_id_type: "open_id" } } : {}),
    }),
  });

  const data = await resp.json();

  if (!resp.ok || data.code !== 0) {
    console.error("Lark freebusy query failed:", data);
    throw new Error("Failed to query Lark free/busy");
  }

  const busyList: Array<{ start: Date; end: Date }> = [];
  const freebusyList = data.data?.freebusy_list ?? [];
  for (const entry of freebusyList) {
    if (entry.start_time && entry.end_time) {
      busyList.push({
        start: new Date(parseInt(entry.start_time) * 1000),
        end: new Date(parseInt(entry.end_time) * 1000),
      });
    }
  }
  return busyList;
}

export async function larkCreateEvent(params: {
  summary: string;
  description?: string;
  startTimeIso: string;
  endTimeIso: string;
}): Promise<string> {
  const accessToken = await getValidAccessToken();

  const startTimestamp = String(Math.floor(new Date(params.startTimeIso).getTime() / 1000));
  const endTimestamp = String(Math.floor(new Date(params.endTimeIso).getTime() / 1000));

  const resp = await fetch(`${LARK_EVENTS_URL}/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: params.summary,
      description: params.description ?? "Auto-scheduled by Morning Focus",
      start_time: {
        timestamp: startTimestamp,
        timezone: "Asia/Seoul",
      },
      end_time: {
        timestamp: endTimestamp,
        timezone: "Asia/Seoul",
      },
      free_busy_status: "busy",
      visibility: "default",
    }),
  });

  const data = await resp.json();

  if (!resp.ok || data.code !== 0) {
    console.error("Lark create event failed:", data);
    throw new Error("Failed to create Lark calendar event");
  }

  return data.data?.event?.event_id ?? "";
}
