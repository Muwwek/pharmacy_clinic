"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleMeta, moduleOrder, type ModuleKey } from "@/lib/api-catalog";

const routeForModule: Record<ModuleKey, string> = {
  auth: "/auth",
  medicines: "/medicines",
  patients: "/patients",
  appointments: "/appointments",
  prescriptions: "/prescriptions",
  dashboard: "/dashboard",
  clinics: "/clinics",
};

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      <Link
        href="/"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          pathname === "/"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        }`}
      >
        Overview
      </Link>

      {moduleOrder.map((moduleKey) => {
        const href = routeForModule[moduleKey];
        const active = pathname === href;
        return (
          <Link
            key={moduleKey}
            href={href}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {moduleMeta[moduleKey].label}
          </Link>
        );
      })}
    </nav>
  );
}
