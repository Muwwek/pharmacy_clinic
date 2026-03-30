"use client";

import { useMemo, useState } from "react";
import {
  buildPath,
  buildQuery,
  getEndpointsByModule,
  moduleMeta,
  type Endpoint,
  type HttpMethod,
  type ModuleKey,
} from "@/lib/api-catalog";
import { AppNav } from "@/components/app-nav";

const methodClass: Record<HttpMethod, string> = {
  GET: "bg-teal-500/15 text-teal-900 ring-teal-500/40",
  POST: "bg-amber-500/15 text-amber-900 ring-amber-500/40",
  PUT: "bg-sky-500/15 text-sky-900 ring-sky-500/40",
  PATCH: "bg-fuchsia-500/15 text-fuchsia-900 ring-fuchsia-500/40",
  DELETE: "bg-rose-500/15 text-rose-900 ring-rose-500/40",
};

type ApiWorkbenchProps = {
  moduleKey: ModuleKey;
};

export function ApiWorkbench({ moduleKey }: ApiWorkbenchProps) {
  const endpointList = useMemo(() => getEndpointsByModule(moduleKey), [moduleKey]);
  const [selectedId, setSelectedId] = useState(endpointList[0]?.id ?? "");
  const [apiBase, setApiBase] = useState("http://localhost:3030");
  const [username, setUsername] = useState("admin");
  const [pathValues, setPathValues] = useState<Record<string, string>>({
    id: "",
    name: "",
    keyword: "",
    category: "",
  });
  const [queryValues, setQueryValues] = useState<Record<string, string>>({
    lng: "101.25",
    lat: "12.68",
    distance: "5000",
  });

  const selectedEndpoint = endpointList.find((item) => item.id === selectedId) ?? endpointList[0];

  const [bodyText, setBodyText] = useState(selectedEndpoint?.defaultBody ?? "");
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("รอผลลัพธ์จากการยิง API");

  function pickEndpoint(endpoint: Endpoint) {
    setSelectedId(endpoint.id);
    setBodyText(endpoint.defaultBody ?? "");
    setStatusCode(null);
    setResponseText("รอผลลัพธ์จากการยิง API");
  }

  async function sendRequest() {
    if (!selectedEndpoint) return;

    const path = buildPath(selectedEndpoint, pathValues);
    const query = buildQuery(selectedEndpoint, queryValues);
    const url = `${apiBase}${path}${query}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (username.trim()) {
      headers.username = username.trim();
    }

    let payload: unknown = undefined;
    if (["POST", "PUT", "PATCH"].includes(selectedEndpoint.method)) {
      if (bodyText.trim()) {
        try {
          payload = JSON.parse(bodyText);
        } catch {
          setStatusCode(null);
          setResponseText("JSON Body ไม่ถูกต้อง กรุณาตรวจ syntax ก่อนส่ง");
          return;
        }
      }
    }

    setLoading(true);
    setResponseText("กำลังส่งคำขอ...");

    try {
      const result = await fetch(url, {
        method: selectedEndpoint.method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });

      setStatusCode(result.status);
      const contentType = result.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await result.json();
        setResponseText(JSON.stringify(data, null, 2));
      } else {
        const text = await result.text();
        setResponseText(text || "ไม่มี response body");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      setStatusCode(null);
      setResponseText(`เชื่อมต่อไม่ได้: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!selectedEndpoint) {
    return <p className="p-8 text-sm text-slate-600">ไม่พบ endpoint ในหมวดนี้</p>;
  }

  const activeMeta = moduleMeta[moduleKey];

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.35)_0%,rgba(16,185,129,0)_70%)]" />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_80px_-40px_rgba(11,61,51,0.65)] backdrop-blur xl:p-8">
          <AppNav />
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-emerald-700">{activeMeta.label}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{activeMeta.headline}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{activeMeta.description}</p>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
          <aside className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.8)] backdrop-blur">
            <h2 className="text-xl font-semibold text-slate-900">{activeMeta.label} Endpoints</h2>
            <p className="mt-1 text-sm text-slate-600">เลือก endpoint แล้วทดสอบทีละรายการ</p>

            <div className="mt-4 space-y-2">
              {endpointList.map((endpoint) => {
                const isActive = endpoint.id === selectedId;
                return (
                  <button
                    key={endpoint.id}
                    type="button"
                    onClick={() => pickEndpoint(endpoint)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isActive
                        ? "border-emerald-400 bg-emerald-50 shadow-[0_10px_25px_-18px_rgba(16,185,129,1)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${methodClass[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <span className="truncate text-xs text-slate-500">{endpoint.path}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">{endpoint.summary}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-6">
            <article className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_20px_70px_-45px_rgba(2,8,23,0.75)] backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">Request Builder</h2>
              <p className="mt-1 text-sm text-slate-600">ตั้งค่า API base/header และ payload ของ endpoint ที่เลือก</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Base URL</span>
                  <input
                    value={apiBase}
                    onChange={(event) => setApiBase(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-400 transition focus:ring-2"
                    placeholder="http://localhost:3030"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username Header</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-400 transition focus:ring-2"
                    placeholder="admin"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${methodClass[selectedEndpoint.method]}`}>
                    {selectedEndpoint.method}
                  </span>
                  <p className="text-sm font-medium">{selectedEndpoint.path}</p>
                </div>
                <p className="mt-2 text-xs text-slate-300">{selectedEndpoint.summary}</p>
              </div>

              {(selectedEndpoint.pathParams?.length ?? 0) > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedEndpoint.pathParams?.map((key) => (
                    <label key={key} className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Path: {key}</span>
                      <input
                        value={pathValues[key] ?? ""}
                        onChange={(event) =>
                          setPathValues((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-400 transition focus:ring-2"
                        placeholder={`ค่า ${key}`}
                      />
                    </label>
                  ))}
                </div>
              )}

              {(selectedEndpoint.queryParams?.length ?? 0) > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedEndpoint.queryParams?.map((key) => (
                    <label key={key} className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Query: {key}</span>
                      <input
                        value={queryValues[key] ?? ""}
                        onChange={(event) =>
                          setQueryValues((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-400 transition focus:ring-2"
                        placeholder={`ค่า ${key}`}
                      />
                    </label>
                  ))}
                </div>
              )}

              {["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) && (
                <label className="mt-4 flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">JSON Body</span>
                  <textarea
                    value={bodyText}
                    onChange={(event) => setBodyText(event.target.value)}
                    rows={10}
                    className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-emerald-100 outline-none ring-emerald-400 transition focus:ring-2"
                  />
                </label>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={sendRequest}
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {loading ? "กำลังส่ง..." : "ส่งคำขอ"}
                </button>
                <p className="text-sm text-slate-600">
                  Target URL: {apiBase}
                  {buildPath(selectedEndpoint, pathValues)}
                  {buildQuery(selectedEndpoint, queryValues)}
                </p>
              </div>
            </article>

            <article className="rounded-3xl border border-white/60 bg-slate-950 p-5 text-slate-100 shadow-[0_20px_70px_-45px_rgba(2,8,23,0.9)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Response Console</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    statusCode === null
                      ? "bg-slate-700 text-slate-200"
                      : statusCode < 300
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {statusCode === null ? "No status" : `HTTP ${statusCode}`}
                </span>
              </div>

              <pre className="mt-4 max-h-105 overflow-auto rounded-2xl bg-black/40 p-4 font-mono text-xs leading-6 text-emerald-100">
                {responseText}
              </pre>
            </article>
          </section>
        </section>
      </main>
    </div>
  );
}
