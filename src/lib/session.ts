import { useEffect, useState } from "react";

export type UserRole = "admin" | "doctor";

export type AppSession = {
  username: string;
  role: UserRole;
  name?: string;
  apiBase: string;
};

const SESSION_KEY = "pharmacy_clinic_session_v1";
const SESSION_CHANGE_EVENT = "pharmacy-session-change";

export function loadSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AppSession;
    if (!parsed.username || !parsed.role || !parsed.apiBase) return null;
    if (parsed.role !== "admin" && parsed.role !== "doctor") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: AppSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function useSessionStore() {
  const [session, setSession] = useState<AppSession | null | undefined>(undefined);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) {
        setSession(loadSession());
      }
    };

    const onSessionChange = () => {
      setSession(loadSession());
    };

    queueMicrotask(onSessionChange);

    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_CHANGE_EVENT, onSessionChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_CHANGE_EVENT, onSessionChange);
    };
  }, []);

  return session;
}

export async function apiRequest<T>(
  session: AppSession,
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  },
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${session.apiBase}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      username: session.username,
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown = null;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    data: data as T,
  };
}
