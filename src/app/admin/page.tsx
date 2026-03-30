"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearSession, useSessionStore, type AppSession } from "@/lib/session";

type UserRecord = {
  _id: string;
  username: string;
  role: "admin" | "doctor";
  name?: string;
};

type EditUserForm = {
  userId: string;
  username: string;
  name: string;
  role: "admin" | "doctor";
  password: string;
};

type MedicineRecord = {
  _id: string;
  name: string;
  category?: string;
  stock?: number;
  price?: number;
  expire_date?: string;
};

type DashboardReportKey = "topMedicines" | "monthlyRevenue" | "stockSummary" | "expiringSoon" | "lowStock";

type TopMedicineRecord = {
  _id: string;
  total_qty: number;
};

type MonthlyRevenueRecord = {
  _id: string;
  total_revenue: number;
  total_prescriptions: number;
};

type StockSummaryRecord = {
  _id: string;
  total_stock: number;
  avg_price: number;
  max_price: number;
  min_price: number;
  count: number;
};

const MEDICINE_CATEGORIES = [
  "Painkiller (ยาแก้ปวด ลดไข้)",
  "Antibiotic (ยาปฏิชีวนะ)",
  "Cold, Cough & Sore Throat (ยาแก้หวัด ไอ เจ็บคอ)",
  "Allergy (ยาแก้แพ้)",
  "Gastrointestinal (ยาระบบทางเดินอาหาร)",
  "Vitamins & Supplements (วิตามินและอาหารเสริม)",
  "Chronic Disease (ยาสำหรับโรคเรื้อรัง)",
  "Topical & Skin Care (ยาทาภายนอกและดูแลผิว)",
  "First Aid (อุปกรณ์ปฐมพยาบาล)",
  "Medical Supplies (เวชภัณฑ์ทางการแพทย์)",
  "Diabetes Care (ยากลุ่มเบาหวาน)",
  "Cardiovascular (ยากลุ่มหัวใจและความดัน)",
  "Eye, Ear & Nasal Care (ยาตา หู จมูก)",
];

const dashboardConfig: Record<
  DashboardReportKey,
  {
    path: string;
    label: string;
    subtitle: string;
  }
> = {
  topMedicines: {
    path: "/dashboard/top-medicines",
    label: "Top Medicines",
    subtitle: "ยาที่มีปริมาณจ่ายสูงสุด",
  },
  monthlyRevenue: {
    path: "/dashboard/monthly-revenue",
    label: "Monthly Revenue",
    subtitle: "รายได้รวมและจำนวนใบสั่งยารายเดือน",
  },
  stockSummary: {
    path: "/dashboard/stock-summary",
    label: "Stock Summary",
    subtitle: "ภาพรวมสต็อกแยกตามหมวดหมู่",
  },
  expiringSoon: {
    path: "/dashboard/expiring-soon",
    label: "Expiring Soon",
    subtitle: "รายการยาที่ใกล้หมดอายุใน 90 วัน",
  },
  lowStock: {
    path: "/dashboard/low-stock",
    label: "Low Stock",
    subtitle: "รายการยาที่มีสต็อกต่ำกว่าเกณฑ์",
  },
};

const DASHBOARD_PAGE_SIZE = 10;

function extractError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }
  if (typeof payload === "string") return payload;
  return "เกิดข้อผิดพลาด";
}

export default function AdminPage() {
  const router = useRouter();
  const session = useSessionStore();
  const [message, setMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserForm | null>(null);
  const [editingSaving, setEditingSaving] = useState(false);

  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", role: "doctor" as "admin" | "doctor" });

  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [medicinesLoading, setMedicinesLoading] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: "",
    category: "",
    stock: "",
    price: "",
    expire_date: "",
  });
  const [stockAmountById, setStockAmountById] = useState<Record<string, string>>({});

  const [dashboardReportKey, setDashboardReportKey] = useState<DashboardReportKey>("topMedicines");
  const [dashboardRows, setDashboardRows] = useState<unknown[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardPage, setDashboardPage] = useState(1);

  async function loadUsers(current: AppSession) {
    setUsersLoading(true);
    const result = await apiRequest<UserRecord[] | { error?: string }>(current, "/auth/users");
    if (result.status >= 400) {
      setMessage(`โหลด users ไม่สำเร็จ: ${extractError(result.data)}`);
      setUsersLoading(false);
      return;
    }
    setUsers(Array.isArray(result.data) ? result.data : []);
    setUsersLoading(false);
  }

  async function loadMedicines(current: AppSession) {
    setMedicinesLoading(true);
    const result = await apiRequest<MedicineRecord[] | { error?: string }>(current, "/medicines");
    if (result.status >= 400) {
      setMessage(`โหลดยาไม่สำเร็จ: ${extractError(result.data)}`);
      setMedicinesLoading(false);
      return;
    }
    setMedicines(Array.isArray(result.data) ? result.data : []);
    setMedicinesLoading(false);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, "/auth/register", {
      method: "POST",
      body: newUser,
    });

    if (result.status >= 400) {
      setMessage(`สร้าง user ไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("สร้าง user สำเร็จ");
    setNewUser({ username: "", password: "", name: "", role: "doctor" });
    await loadUsers(session);
  }

  async function editUser(user: UserRecord) {
    setEditingUser({
      userId: user._id,
      username: user.username,
      name: user.name ?? "",
      role: user.role,
      password: "",
    });
  }

  async function saveUserEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !editingUser) return;

    const payload: { username: string; name: string; role: "admin" | "doctor"; password?: string } = {
      username: editingUser.username.trim(),
      name: editingUser.name.trim(),
      role: editingUser.role,
    };

    if (!payload.username || !payload.name) {
      setMessage("username และ name ห้ามว่าง");
      return;
    }

    if (editingUser.password.trim()) {
      payload.password = editingUser.password.trim();
    }

    setEditingSaving(true);
    const result = await apiRequest<{ error?: string; message?: string }>(session, `/auth/users/${editingUser.userId}`, {
      method: "PUT",
      body: payload,
    });

    setEditingSaving(false);

    if (result.status >= 400) {
      setMessage(`แก้ไข user ไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("แก้ไข user สำเร็จ");
    setEditingUser(null);
    await loadUsers(session);
  }

  async function deleteUser(userId: string) {
    if (!session) return;
    const confirmed = window.confirm("ยืนยันการลบ user นี้?");
    if (!confirmed) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, `/auth/users/${userId}`, {
      method: "DELETE",
    });

    if (result.status >= 400) {
      setMessage(`ลบ user ไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("ลบ user สำเร็จ");
    await loadUsers(session);
  }

  async function createMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const body = {
      name: newMedicine.name,
      category: newMedicine.category.split(" (")[0].trim(),
      stock: Number(newMedicine.stock),
      price: Number(newMedicine.price),
      expire_date: newMedicine.expire_date,
    };

    const result = await apiRequest<{ error?: string; message?: string }>(session, "/medicines", {
      method: "POST",
      body,
    });

    if (result.status >= 400) {
      setMessage(`เพิ่มยาไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("เพิ่มยาสำเร็จ");
    setNewMedicine({ name: "", category: "", stock: "", price: "", expire_date: "" });
    await loadMedicines(session);
  }

  async function addStock(medicineId: string) {
    if (!session) return;
    const amount = Number(stockAmountById[medicineId] ?? "0");
    const result = await apiRequest<{ error?: string; message?: string }>(session, `/medicines/${medicineId}/stock`, {
      method: "PATCH",
      body: { amount },
    });

    if (result.status >= 400) {
      setMessage(`เติมสต็อกไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("เติมสต็อกสำเร็จ");
    setStockAmountById((prev) => ({ ...prev, [medicineId]: "" }));
    await loadMedicines(session);
  }

  async function deleteMedicine(medicineId: string) {
    if (!session) return;
    const confirmed = window.confirm("ยืนยันการลบยานี้?");
    if (!confirmed) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, `/medicines/${medicineId}`, {
      method: "DELETE",
    });

    if (result.status >= 400) {
      setMessage(`ลบยาไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("ลบยาสำเร็จ");
    await loadMedicines(session);
  }

  async function loadDashboard(reportKey: DashboardReportKey) {
    if (!session) return;
    setDashboardLoading(true);
    const result = await apiRequest<unknown>(session, dashboardConfig[reportKey].path);
    if (result.status >= 400) {
      setMessage(`โหลดรายงานไม่สำเร็จ: ${extractError(result.data)}`);
      setDashboardLoading(false);
      return;
    }
    setDashboardReportKey(reportKey);
    setDashboardRows(Array.isArray(result.data) ? result.data : []);
    setDashboardPage(1);
    setDashboardLoading(false);
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  useEffect(() => {
    if (session === undefined) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== "admin") {
      router.replace("/doctor");
    }
  }, [router, session]);

  useEffect(() => {
    if (!session || session.role !== "admin") return;

    const timerId = window.setTimeout(() => {
      void (async () => {
        await Promise.all([loadUsers(session), loadMedicines(session)]);

        setDashboardLoading(true);
        const dashboardResult = await apiRequest<unknown>(session, dashboardConfig.topMedicines.path);
        if (dashboardResult.status >= 400) {
          setMessage(`โหลดรายงานไม่สำเร็จ: ${extractError(dashboardResult.data)}`);
          setDashboardLoading(false);
          return;
        }

        setDashboardReportKey("topMedicines");
        setDashboardRows(Array.isArray(dashboardResult.data) ? dashboardResult.data : []);
        setDashboardPage(1);
        setDashboardLoading(false);
      })();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [session]);

  if (session === undefined || !session || session.role !== "admin") {
    return <p className="p-8 text-sm text-slate-600">กำลังโหลด...</p>;
  }

  const topRows = dashboardRows as TopMedicineRecord[];
  const revenueRows = dashboardRows as MonthlyRevenueRecord[];
  const stockRows = dashboardRows as StockSummaryRecord[];

  const totalTopQty = topRows.reduce((sum, row) => sum + (row.total_qty ?? 0), 0);
  const totalRevenue = revenueRows.reduce((sum, row) => sum + (row.total_revenue ?? 0), 0);
  const totalPrescriptions = revenueRows.reduce((sum, row) => sum + (row.total_prescriptions ?? 0), 0);
  const totalStock = stockRows.reduce((sum, row) => sum + (row.total_stock ?? 0), 0);
  const totalCategories = stockRows.length;
  const dashboardTotalPages = Math.max(1, Math.ceil(dashboardRows.length / DASHBOARD_PAGE_SIZE));
  const dashboardCurrentPage = Math.min(dashboardPage, dashboardTotalPages);
  const dashboardPageStart = (dashboardCurrentPage - 1) * DASHBOARD_PAGE_SIZE;
  const dashboardPageRows = dashboardRows.slice(dashboardPageStart, dashboardPageStart + DASHBOARD_PAGE_SIZE);
  const pagedTopRows = dashboardPageRows as TopMedicineRecord[];
  const pagedRevenueRows = dashboardPageRows as MonthlyRevenueRecord[];
  const pagedStockRows = dashboardPageRows as StockSummaryRecord[];
  const pagedMedicineRows = dashboardPageRows as MedicineRecord[];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 lg:px-12">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_80px_-45px_rgba(2,8,23,0.85)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Admin Panel</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">สวัสดี {session.name ?? session.username}</h1>
              <p className="mt-1 text-sm text-slate-600">จัดการผู้ใช้, ยา และดู dashboard จากระบบ backend</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={logout}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Backend: {session.apiBase} | Header username: {session.username}</p>
          <p className="mt-1 text-xs text-slate-500">หน้านี้ใช้สำหรับงานผู้ดูแลระบบ: ผู้ใช้, ยา และรายงานภาพรวม โดยจะโหลดข้อมูลอัตโนมัติเมื่อเข้าหน้า</p>
          {message ? <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        </header>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_-50px_rgba(2,8,23,0.85)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
              <button
                type="button"
                onClick={() => void loadUsers(session)}
                className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                aria-label="รีโหลดข้อมูลผู้ใช้"
                title="รีโหลด"
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">สร้างหรือแก้ไขบัญชีผู้ใช้ระบบ (ผู้ดูแล/แพทย์)</p>
            <form onSubmit={createUser} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Username เข้าระบบ</span>
                <input
                  value={newUser.username}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="เช่น doctor01"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">รหัสผ่าน</span>
                <input
                  value={newUser.password}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">ชื่อแสดงผล</span>
                <input
                  value={newUser.name}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="เช่น นพ.สมชาย ใจดี"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">สิทธิ์การใช้งาน</span>
                <select
                  value={newUser.role}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as "admin" | "doctor" }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:col-span-2">
                สร้าง User
              </button>
            </form>

            <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Username</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        กำลังโหลด...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{user.username}</td>
                        <td className="px-3 py-2">{user.name ?? "-"}</td>
                        <td className="px-3 py-2">{user.role}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => editUser(user)}
                              className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-slate-900"
                            >
                              แก้ไขข้อมูล
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser(user._id)}
                              className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                            >
                              ลบผู้ใช้
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_-50px_rgba(2,8,23,0.85)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Medicine Management</h2>
              <button
                type="button"
                onClick={() => void loadMedicines(session)}
                className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                aria-label="รีโหลดข้อมูลยา"
                title="รีโหลด"
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">เพิ่มรายการยาใหม่เข้าระบบ พร้อมกำหนดวันหมดอายุและจำนวนคงคลัง</p>
            <form onSubmit={createMedicine} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1">
                <span className="text-xs font-semibold text-slate-600">ชื่อยา</span>
                <input
                  value={newMedicine.name}
                  onChange={(event) => setNewMedicine((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="เช่น Paracetamol 500mg"
                  required
                />
              </label>
              <label className="grid min-w-0 gap-1">
                <span className="text-xs font-semibold text-slate-600">หมวดหมู่ประเภทยา</span>
                <select
                  value={newMedicine.category}
                  onChange={(event) => setNewMedicine((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  required
                >
                  <option value="" disabled>
                    เลือกหมวด
                  </option>
                  {MEDICINE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">จำนวนสต็อกตั้งต้น (ชิ้น)</span>
                <input
                  type="number"
                  value={newMedicine.stock}
                  onChange={(event) => setNewMedicine((prev) => ({ ...prev, stock: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="เช่น 120"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">ราคาต่อหน่วย (บาท)</span>
                <input
                  type="number"
                  value={newMedicine.price}
                  onChange={(event) => setNewMedicine((prev) => ({ ...prev, price: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="เช่น 35"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">วันหมดอายุยา</span>
                <input
                  type="date"
                  value={newMedicine.expire_date}
                  onChange={(event) => setNewMedicine((prev) => ({ ...prev, expire_date: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <span className="text-[11px] text-slate-500">ใช้ระบุวันที่ยาหมดอายุจริงจากฉลากยา</span>
              </label>
              <button className="justify-self-start rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:col-span-2">
                เพิ่มยา
              </button>
            </form>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">รายการยาในระบบ</p>
              {medicinesLoading ? <p className="text-sm text-slate-500">กำลังโหลด...</p> : null}
              <div className="max-h-105 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                <div className="space-y-3">
                  {medicines.map((medicine) => (
                    <div key={medicine._id} className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.7)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{medicine.name}</p>
                          <p className="mt-1 inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                            {medicine.category ?? "ไม่ระบุหมวด"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMedicine(medicine._id)}
                          className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                        >
                          ลบรายการ
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                        <p className="rounded-lg bg-slate-50 px-2 py-1">สต็อกคงเหลือ: {medicine.stock ?? "-"}</p>
                        <p className="rounded-lg bg-slate-50 px-2 py-1">ราคาต่อหน่วย: {medicine.price ?? "-"} บาท</p>
                        <p className="rounded-lg bg-slate-50 px-2 py-1">รหัสยา: {medicine._id.slice(-6)}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <input
                          type="number"
                          value={stockAmountById[medicine._id] ?? ""}
                          onChange={(event) =>
                            setStockAmountById((prev) => ({
                              ...prev,
                              [medicine._id]: event.target.value,
                            }))
                          }
                          className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          placeholder="จำนวนเติม"
                        />
                        <button
                          type="button"
                          onClick={() => addStock(medicine._id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          เติมสต็อก
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>

        <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_-50px_rgba(2,8,23,0.85)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Executive Dashboard</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Operational Reports</h2>
              <p className="mt-1 text-sm text-slate-600">{dashboardConfig[dashboardReportKey].subtitle}</p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {dashboardRows.length} records
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(dashboardConfig) as DashboardReportKey[]).map((key) => {
              const active = key === dashboardReportKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => loadDashboard(key)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-[0_8px_24px_-14px_rgba(15,23,42,0.9)]"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {dashboardConfig[key].label}
                </button>
              );
            })}
          </div>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Report</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{dashboardConfig[dashboardReportKey].label}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Rows</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{dashboardRows.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Revenue Total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalRevenue.toLocaleString()}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Top Qty / Stock</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{Math.max(totalTopQty, totalStock).toLocaleString()}</p>
            </article>
          </section>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-white">
            {dashboardLoading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">กำลังโหลดรายงาน...</p>
            ) : dashboardRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีข้อมูล ให้เลือกรายงานที่ต้องการ</p>
            ) : dashboardReportKey === "topMedicines" ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Medicine Name</th>
                    <th className="px-4 py-3">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTopRows.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{row._id}</td>
                      <td className="px-4 py-2">{row.total_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : dashboardReportKey === "monthlyRevenue" ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Prescriptions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRevenueRows.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{row._id}</td>
                      <td className="px-4 py-2">{row.total_revenue.toLocaleString()}</td>
                      <td className="px-4 py-2">{row.total_prescriptions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : dashboardReportKey === "stockSummary" ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Total Stock</th>
                    <th className="px-4 py-3">Avg Price</th>
                    <th className="px-4 py-3">Range (Min-Max)</th>
                    <th className="px-4 py-3">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStockRows.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{row._id}</td>
                      <td className="px-4 py-2">{row.total_stock.toLocaleString()}</td>
                      <td className="px-4 py-2">{row.avg_price.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.min_price} - {row.max_price}</td>
                      <td className="px-4 py-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Expire Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMedicineRows.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-2">{row.category ?? "-"}</td>
                      <td className="px-4 py-2">{row.stock ?? "-"}</td>
                      <td className="px-4 py-2">{row.expire_date ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {dashboardRows.length > DASHBOARD_PAGE_SIZE ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <p>
                แสดง {dashboardPageStart + 1}-{Math.min(dashboardPageStart + DASHBOARD_PAGE_SIZE, dashboardRows.length)} จาก {dashboardRows.length} รายการ
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDashboardPage((prevPage) => Math.max(1, prevPage - 1))}
                  disabled={dashboardCurrentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <span className="min-w-22 text-center text-slate-700">
                  หน้า {dashboardCurrentPage} / {dashboardTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setDashboardPage((prevPage) => Math.min(dashboardTotalPages, prevPage + 1))}
                  disabled={dashboardCurrentPage === dashboardTotalPages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Summary: prescriptions {totalPrescriptions.toLocaleString()} | categories {totalCategories.toLocaleString()} | top qty {totalTopQty.toLocaleString()}
          </div>
        </article>

        {editingUser ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.95)]">
              <h3 className="text-lg font-semibold text-slate-900">แก้ไขข้อมูลผู้ใช้</h3>
              <p className="mt-1 text-xs text-slate-500">แก้ไข username, ชื่อ, role และรหัสผ่านใหม่ (ถ้าต้องการ)</p>

              <form onSubmit={saveUserEdit} className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</span>
                  <input
                    value={editingUser.username}
                    onChange={(event) => setEditingUser((prev) => (prev ? { ...prev, username: event.target.value } : prev))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                  <input
                    value={editingUser.name}
                    onChange={(event) => setEditingUser((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</span>
                  <select
                    value={editingUser.role}
                    onChange={(event) =>
                      setEditingUser((prev) => (prev ? { ...prev, role: event.target.value as "admin" | "doctor" } : prev))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="doctor">doctor</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</span>
                  <input
                    type="password"
                    value={editingUser.password}
                    onChange={(event) => setEditingUser((prev) => (prev ? { ...prev, password: event.target.value } : prev))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="ปล่อยว่างถ้าไม่เปลี่ยน"
                  />
                </label>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={editingSaving}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {editingSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
