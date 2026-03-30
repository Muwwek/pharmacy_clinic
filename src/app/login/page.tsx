"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, type UserRole } from "@/lib/session";

type LoginResponse = {
  message?: string;
  username?: string;
  role?: UserRole;
  name?: string;
  error?: string;
};

const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() ?? "";

function resolveApiBase() {
  if (CONFIGURED_API_BASE) return CONFIGURED_API_BASE;
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3030`;
  }
  return "http://localhost:3030";
}

export default function LoginPage() {
  const router = useRouter();
  const [apiBase] = useState(resolveApiBase);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json()) as LoginResponse;
      if (!response.ok || !payload.role || !payload.username) {
        setError(payload.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        setLoading(false);
        return;
      }

      saveSession({
        username: payload.username,
        role: payload.role,
        name: payload.name,
        apiBase,
      });

      router.push(payload.role === "admin" ? "/admin" : "/doctor");
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-cyan-50 via-emerald-50 to-sky-100 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Left Panel */}
        <div className="hidden md:flex flex-col justify-center bg-linear-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white p-10">
          <h1 className="text-3xl font-bold">Pharmacy System</h1>
          <p className="mt-4 text-sm text-white/90 leading-relaxed">
            ระบบบริหารจัดการร้านขายยาและคลินิกเภสัช
            รองรับผู้ป่วย สต็อกยา และใบสั่งยา
          </p>
        </div>

        {/* Right Panel */}
        <div className="p-8 sm:p-10">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">
            เข้าสู่ระบบ
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Floating Input Username */}
            <div className="relative">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                required
              />
              <label className="absolute left-3 top-2 text-xs text-slate-500 transition-all peer-focus:text-cyan-600 peer-focus:top-1 peer-valid:top-1 peer-valid:text-xs">
                Enter your username
              </label>
            </div>

            {/* Floating Input Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full border border-slate-300 rounded-lg px-3 pt-5 pb-2 pr-11 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-600"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3 3 18 18" />
                    <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
                    <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 7.5a11.82 11.82 0 0 1-3.13 4.24" />
                    <path d="M6.61 6.61A12.25 12.25 0 0 0 1 11.5C2.73 15.89 7 19 12 19a10.94 10.94 0 0 0 4.24-.88" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              <label className="absolute left-3 top-2 text-xs text-slate-500 transition-all peer-focus:text-cyan-600 peer-focus:top-1 peer-valid:top-1 peer-valid:text-xs">
                Enter your password
              </label>
            </div>

            {error && (
              <div className="bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white py-2 rounded-lg font-medium transition"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400 text-center">
            Connected to: {apiBase}
          </p>
        </div>
      </div>
    </div>
  );
}
