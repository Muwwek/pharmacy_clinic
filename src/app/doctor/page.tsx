"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearSession, useSessionStore, type AppSession } from "@/lib/session";

type PatientRecord = {
  _id: string;
  name: string;
  age?: number;
  gender?: string;
  address?: string;
  phone?: string;
};

type AppointmentRecord = {
  _id: string;
  patient_name?: string;
  date?: string;
  time?: string;
  status?: string;
};

type PrescriptionRecord = {
  _id: string;
  patient_name?: string;
  issued_date?: string;
  total_price?: number;
  medicines?: Array<{ name: string; qty: number }>;
};

type PrescriptionMedicineForm = {
  name: string;
  qty: string;
};

type MedicineRecord = {
  _id: string;
  name: string;
  price?: number;
};

function extractError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }
  if (typeof payload === "string") return payload;
  return "เกิดข้อผิดพลาด";
}

function isAppointmentLocked(status?: string): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "done" || normalized === "cancelled" || normalized === "cancel";
}

function getAppointmentWatermark(status?: string): string | null {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "done") return "DONE";
  if (normalized === "cancelled" || normalized === "cancel") return "CANCEL";
  return null;
}

export default function DoctorPage() {
  const router = useRouter();
  const session = useSessionStore();
  const [message, setMessage] = useState<string | null>(null);

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [patientForm, setPatientForm] = useState({ name: "", age: "", gender: "", address: "", phone: "" });
  const [searchName, setSearchName] = useState("");

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentForm, setAppointmentForm] = useState({ patient_name: "", date: "", time: "", status: "pending" });

  const [medicineCatalog, setMedicineCatalog] = useState<MedicineRecord[]>([]);

  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRecord | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({ patient_name: "", issued_date: "" });
  const [prescriptionMedicines, setPrescriptionMedicines] = useState<PrescriptionMedicineForm[]>([{ name: "", qty: "1" }]);

  const totalPrice = useMemo(() => {
    const priceByName = new Map(medicineCatalog.map((item) => [item.name, Number(item.price ?? 0)]));

    return prescriptionMedicines.reduce((sum, item) => {
      const qty = Number(item.qty);
      const unitPrice = Number(priceByName.get(item.name) ?? 0);
      if (!item.name || !Number.isFinite(qty) || qty <= 0) return sum;
      return sum + unitPrice * qty;
    }, 0);
  }, [medicineCatalog, prescriptionMedicines]);

  async function loadPatients(current: AppSession) {
    const result = await apiRequest<PatientRecord[] | { error?: string }>(current, "/patients");
    if (result.status >= 400) {
      setMessage(`โหลดผู้ป่วยไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }
    setPatients(Array.isArray(result.data) ? result.data : []);
  }

  async function searchPatientsByName() {
    if (!session) return;
    const keyword = searchName.trim();
    if (!keyword) {
      await loadPatients(session);
      return;
    }

    const result = await apiRequest<PatientRecord[] | { error?: string }>(session, `/patients/search/${encodeURIComponent(keyword)}`);
    if (result.status >= 400) {
      setMessage(`ค้นหาผู้ป่วยไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }
    setPatients(Array.isArray(result.data) ? result.data : []);
  }

  async function clearPatientSearch() {
    if (!session) return;
    setSearchName("");
    await loadPatients(session);
  }

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const body = {
      name: patientForm.name,
      age: Number(patientForm.age),
      gender: patientForm.gender,
      address: patientForm.address,
      phone: patientForm.phone,
    };

    const result = await apiRequest<{ error?: string; message?: string }>(session, "/patients", {
      method: "POST",
      body,
    });

    if (result.status >= 400) {
      setMessage(`เพิ่มผู้ป่วยไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("เพิ่มผู้ป่วยสำเร็จ");
    setPatientForm({ name: "", age: "", gender: "", address: "", phone: "" });
    await loadPatients(session);
  }

  async function deletePatient(patientId: string) {
    if (!session) return;
    const confirmed = window.confirm("ยืนยันการลบผู้ป่วยนี้?");
    if (!confirmed) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, `/patients/${patientId}`, {
      method: "DELETE",
    });

    if (result.status >= 400) {
      setMessage(`ลบผู้ป่วยไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("ลบผู้ป่วยสำเร็จ");
    await loadPatients(session);
  }

  async function loadAppointments(current: AppSession) {
    const result = await apiRequest<AppointmentRecord[] | { error?: string }>(current, "/appointments");
    if (result.status >= 400) {
      setMessage(`โหลดนัดหมายไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }
    setAppointments(Array.isArray(result.data) ? result.data : []);
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, "/appointments", {
      method: "POST",
      body: appointmentForm,
    });

    if (result.status >= 400) {
      setMessage(`สร้างนัดหมายไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("สร้างนัดหมายสำเร็จ");
    setAppointmentForm({ patient_name: "", date: "", time: "", status: "pending" });
    await loadAppointments(session);
  }

  async function updateAppointmentStatus(appointment: AppointmentRecord, status: string) {
    if (!session) return;
    if (isAppointmentLocked(appointment.status)) {
      setMessage("นัดหมายนี้ถูกปิดสถานะแล้ว ไม่สามารถแก้ไขได้");
      return;
    }

    const result = await apiRequest<{ error?: string; message?: string }>(session, `/appointments/${appointment._id}/status`, {
      method: "PATCH",
      body: { status },
    });

    if (result.status >= 400) {
      setMessage(`อัปเดตสถานะไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("อัปเดตสถานะสำเร็จ");
    await loadAppointments(session);
  }

  async function deleteAppointment(appointmentId: string) {
    if (!session) return;
    const confirmed = window.confirm("ยืนยันการลบนัดหมายนี้?");
    if (!confirmed) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, `/appointments/${appointmentId}`, {
      method: "DELETE",
    });

    if (result.status >= 400) {
      setMessage(`ลบนัดหมายไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("ลบนัดหมายสำเร็จ");
    await loadAppointments(session);
  }

  async function loadPrescriptions(current: AppSession) {
    const result = await apiRequest<PrescriptionRecord[] | { error?: string }>(current, "/prescriptions");
    if (result.status >= 400) {
      setMessage(`โหลดใบสั่งยาไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }
    setPrescriptions(Array.isArray(result.data) ? result.data : []);
  }

  async function loadMedicines(current: AppSession) {
    const result = await apiRequest<MedicineRecord[] | { error?: string }>(current, "/medicines");
    if (result.status >= 400) {
      setMessage(`โหลดรายการยาไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }
    setMedicineCatalog(Array.isArray(result.data) ? result.data : []);
  }

  function useLatestPatientInfo() {
    if (patients.length === 0) {
      setMessage("ยังไม่มีข้อมูลผู้ป่วยให้ดึงล่าสุด");
      return;
    }

    const latestPatient = patients[patients.length - 1];
    setPrescriptionForm((prev) => ({ ...prev, patient_name: latestPatient.name ?? "" }));
    setMessage("เติมชื่อผู้ป่วยล่าสุดให้แล้ว");
  }

  async function createPrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const cleanedPatient = prescriptionForm.patient_name.trim();
    const cleanedDate = prescriptionForm.issued_date.trim();
    const medicines = prescriptionMedicines
      .map((item) => ({ name: item.name.trim(), qty: Number(item.qty) }))
      .filter((item) => item.name.length > 0 && Number.isFinite(item.qty) && item.qty > 0);

    if (!cleanedPatient || !cleanedDate) {
      setMessage("กรุณากรอกชื่อผู้ป่วยและวันที่ออกใบสั่งยา");
      return;
    }

    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      setMessage("ไม่สามารถคำนวณราคารวมได้ กรุณาตรวจสอบจำนวนยา");
      return;
    }

    if (medicines.length === 0) {
      setMessage("กรุณาเพิ่มรายการยาอย่างน้อย 1 รายการ");
      return;
    }

    const body = {
      patient_name: cleanedPatient,
      issued_date: cleanedDate,
      total_price: totalPrice,
      medicines,
    };

    const result = await apiRequest<{ error?: string; message?: string }>(session, "/prescriptions", {
      method: "POST",
      body,
    });

    if (result.status >= 400) {
      setMessage(`สร้างใบสั่งยาไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("สร้างใบสั่งยาสำเร็จ");
    setPrescriptionForm({ patient_name: "", issued_date: "" });
    setPrescriptionMedicines([{ name: "", qty: "1" }]);
    await loadPrescriptions(session);
  }

  async function cancelPrescription(prescriptionId: string) {
    if (!session) return;
    const confirmed = window.confirm("ยืนยันการยกเลิกใบสั่งยานี้?");
    if (!confirmed) return;

    const result = await apiRequest<{ error?: string; message?: string }>(session, `/prescriptions/${prescriptionId}/cancel`, {
      method: "DELETE",
    });

    if (result.status >= 400) {
      setMessage(`ยกเลิกใบสั่งยาไม่สำเร็จ: ${extractError(result.data)}`);
      return;
    }

    setMessage("ยกเลิกใบสั่งยาสำเร็จ");
    await loadPrescriptions(session);
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
    if (session.role !== "doctor") {
      router.replace("/admin");
    }
  }, [router, session]);

  useEffect(() => {
    if (!session || session.role !== "doctor") return;

    const timerId = window.setTimeout(() => {
      void (async () => {
        await Promise.all([loadPatients(session), loadAppointments(session), loadPrescriptions(session), loadMedicines(session)]);
      })();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [session]);

  if (session === undefined || !session || session.role !== "doctor") {
    return <p className="p-8 text-sm text-slate-600">กำลังโหลด...</p>;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 lg:px-12">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_80px_-45px_rgba(2,8,23,0.85)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Doctor Panel</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">สวัสดี {session.name ?? session.username}</h1>
              <p className="mt-1 text-sm text-slate-600">จัดการผู้ป่วย, นัดหมาย และใบสั่งยา</p>
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
          <p className="mt-1 text-xs text-slate-500">หน้านี้ใช้สำหรับงานแพทย์: ผู้ป่วย, นัดหมาย, ใบสั่งยา และจะโหลดข้อมูลให้อัตโนมัติเมื่อเข้าหน้า</p>
          {message ? <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        </header>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_-50px_rgba(2,8,23,0.85)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Patients</h2>
              <button
                type="button"
                onClick={() => void loadPatients(session)}
                className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                aria-label="รีโหลดข้อมูลผู้ป่วย"
                title="รีโหลด"
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">แยกการเพิ่มผู้ป่วยใหม่กับการค้นหาผู้ป่วย เพื่อใช้งานได้ง่ายและไม่สับสน</p>

            <section className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/55 p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  +
                </span>
                เพิ่มผู้ป่วยใหม่
              </h3>
              <form onSubmit={createPatient} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <label className="grid min-w-0 gap-1">
                  <span className="text-xs font-semibold text-slate-600">ชื่อผู้ป่วย</span>
                  <input
                    value={patientForm.name}
                    onChange={(event) => setPatientForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="เช่น สมชาย ใจดี"
                    required
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  <span className="text-xs font-semibold text-slate-600">อายุ</span>
                  <input
                    type="number"
                    value={patientForm.age}
                    onChange={(event) => setPatientForm((prev) => ({ ...prev, age: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="เช่น 30"
                    required
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  <span className="text-xs font-semibold text-slate-600">เพศ</span>
                  <select
                    value={patientForm.gender}
                    onChange={(event) => setPatientForm((prev) => ({ ...prev, gender: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    required
                  >
                    <option value="" disabled>
                      เลือกเพศ
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>
                <label className="grid min-w-0 gap-1 lg:col-span-3">
                  <span className="text-xs font-semibold text-slate-600">ที่อยู่</span>
                  <textarea
                    value={patientForm.address}
                    onChange={(event) => setPatientForm((prev) => ({ ...prev, address: event.target.value }))}
                    className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="เช่น 123 ถนนสุขุมวิท กรุงเทพฯ"
                    required
                  />
                </label>
                <label className="grid min-w-0 gap-1 lg:col-span-3">
                  <span className="text-xs font-semibold text-slate-600">เบอร์โทร</span>
                  <input
                    value={patientForm.phone}
                    onChange={(event) => setPatientForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="เช่น 0991234567"
                    required
                  />
                </label>
                <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 lg:col-span-3">
                  เพิ่มผู้ป่วย
                </button>
              </form>
            </section>

            <section className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/55 p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  ?
                </span>
                ค้นหาผู้ป่วย
              </h3>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={searchName}
                  onChange={(event) => setSearchName(event.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="พิมพ์ชื่อผู้ป่วยที่ต้องการค้นหา"
                />
                <button
                  type="button"
                  onClick={searchPatientsByName}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  ค้นหาผู้ป่วย
                </button>
                <button
                  type="button"
                  onClick={() => void clearPatientSearch()}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                >
                  ล้างค้นหา
                </button>
              </div>
            </section>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700">=</span>
                ผลลัพธ์ผู้ป่วย
              </p>

              <div className="space-y-2">
                {patients.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีข้อมูลผู้ป่วย หรือกำลังโหลดจาก backend</p> : null}
                {patients.map((patient) => (
                  <div key={patient._id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-xs text-slate-500">
                          อายุ {patient.age ?? "-"} | เพศ {patient.gender ?? "-"} | {patient.phone ?? "-"}
                        </p>
                        <p className="text-xs text-slate-500">ที่อยู่: {patient.address ?? "-"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deletePatient(patient._id)}
                        className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_-50px_rgba(2,8,23,0.85)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Appointments</h2>
              <button
                type="button"
                onClick={() => void loadAppointments(session)}
                className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                aria-label="รีโหลดข้อมูลนัดหมาย"
                title="รีโหลด"
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>
            <form onSubmit={createAppointment} className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                value={appointmentForm.patient_name}
                onChange={(event) => setAppointmentForm((prev) => ({ ...prev, patient_name: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={patients.length === 0}
                required
              >
                <option value="" disabled>
                  {patients.length === 0 ? "ยังไม่มีผู้ป่วยในระบบ" : "เลือกชื่อผู้ป่วยในระบบ"}
                </option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient.name}>
                    {patient.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={appointmentForm.date}
                onChange={(event) => setAppointmentForm((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
              <input
                type="time"
                value={appointmentForm.time}
                onChange={(event) => setAppointmentForm((prev) => ({ ...prev, time: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
              <select
                value={appointmentForm.status}
                onChange={(event) => setAppointmentForm((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="pending">pending</option>
                <option value="done">done</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:col-span-2">
                สร้างนัดหมาย
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {appointments.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีนัดหมาย หรือกำลังโหลดจาก backend</p> : null}
              {appointments.map((appointment) => {
                const locked = isAppointmentLocked(appointment.status);
                const watermark = getAppointmentWatermark(appointment.status);

                return (
                <div
                  key={appointment._id}
                  className={`relative overflow-hidden rounded-2xl border p-3 ${
                    locked ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
                  }`}
                >
                  {watermark ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="-rotate-12 text-4xl font-extrabold tracking-[0.2em] text-slate-300/80">{watermark}</span>
                    </div>
                  ) : null}
                  <p className="font-semibold text-slate-900">{appointment.patient_name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500">
                    {appointment.date ?? "-"} {appointment.time ?? "-"} | status: {appointment.status ?? "-"}
                  </p>
                  <div className="relative z-10 mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateAppointmentStatus(appointment, "done")}
                      disabled={locked}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      done
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAppointmentStatus(appointment, "cancelled")}
                      disabled={locked}
                      className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-amber-200"
                    >
                      cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAppointment(appointment._id)}
                      className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      delete
                    </button>
                  </div>
                </div>
              );})}
            </div>
          </article>
        </section>

        <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_-50px_rgba(2,8,23,0.85)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Prescriptions</h2>
            <button
              type="button"
              onClick={() => void loadPrescriptions(session)}
              className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
              aria-label="รีโหลดข้อมูลใบสั่งยา"
              title="รีโหลด"
            >
              <span aria-hidden="true">↻</span>
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">กรอกข้อมูลด้านล่างแบบทีละช่อง เพื่อออกใบสั่งยาได้ง่ายและชัดเจน</p>

          <form onSubmit={createPrescription} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">ชื่อผู้ป่วยสำหรับใบสั่งยา</span>
                <select
                  value={prescriptionForm.patient_name}
                  onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, patient_name: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  disabled={patients.length === 0}
                  required
                >
                  <option value="" disabled>
                    {patients.length === 0 ? "ยังไม่มีผู้ป่วยในระบบ" : "เลือกผู้ป่วยในระบบ"}
                  </option>
                  {patients.map((patient) => (
                    <option key={patient._id} value={patient.name}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">วันที่ออกใบสั่งยา</span>
                <input
                  type="date"
                  value={prescriptionForm.issued_date}
                  onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, issued_date: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">ราคารวม (คำนวณอัตโนมัติ)</span>
                <input
                  value={totalPrice.toLocaleString()}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  readOnly
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">รายการยา</p>
                <button
                  type="button"
                  onClick={() => setPrescriptionMedicines((prev) => [...prev, { name: "", qty: "1" }])}
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
                >
                  + เพิ่มรายการยา
                </button>
              </div>

              <div className="space-y-2">
                {prescriptionMedicines.map((item, index) => (
                  <div key={`${index}-${item.name}`} className="grid gap-2 sm:grid-cols-[1fr_120px_84px]">
                    <select
                      value={item.name}
                      onChange={(event) =>
                        setPrescriptionMedicines((prev) =>
                          prev.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      disabled={medicineCatalog.length === 0}
                      required
                    >
                      <option value="">{medicineCatalog.length === 0 ? "ไม่มีรายการยาในคลัง" : "เลือกชื่อยา"}</option>
                      {medicineCatalog.map((medicine) => (
                        <option key={medicine._id} value={medicine.name}>
                          {medicine.name} ({Number(medicine.price ?? 0)} บาท)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(event) =>
                        setPrescriptionMedicines((prev) =>
                          prev.map((row, rowIndex) => (rowIndex === index ? { ...row, qty: event.target.value } : row)),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="จำนวน"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPrescriptionMedicines((prev) => {
                          if (prev.length === 1) return [{ name: "", qty: "1" }];
                          return prev.filter((_, rowIndex) => rowIndex !== index);
                        })
                      }
                      className="rounded-lg bg-rose-600 px-2 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      ลบรายการ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              สร้างใบสั่งยา
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {prescriptions.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีใบสั่งยา หรือกำลังโหลดจาก backend</p> : null}
            {prescriptions.map((item) => (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.patient_name ?? "Unknown patient"}</p>
                    <p className="text-xs text-slate-500">
                      {item.issued_date ?? "-"} | total: {item.total_price ?? "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPrescription(item)}
                      className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelPrescription(item._id)}
                      className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        {selectedPrescription ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.95)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">รายละเอียดใบสั่งยา</h3>
                  <p className="mt-1 text-xs text-slate-500">ตรวจสอบข้อมูลยาก่อนยืนยันการใช้งาน</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPrescription(null)}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  ปิด
                </button>
              </div>

              <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">ผู้ป่วย:</span> {selectedPrescription.patient_name ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">วันที่ออก:</span> {selectedPrescription.issued_date ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">ราคารวม:</span> {selectedPrescription.total_price ?? "-"}
                </p>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">รายการยา</p>
                {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2">ชื่อยา</th>
                          <th className="px-3 py-2">จำนวน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPrescription.medicines.map((medicine, index) => (
                          <tr key={`${medicine.name}-${index}`} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-800">{medicine.name}</td>
                            <td className="px-3 py-2 text-slate-700">{medicine.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">ไม่มีรายการยาในใบสั่งนี้</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
