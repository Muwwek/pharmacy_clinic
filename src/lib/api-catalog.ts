export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ModuleKey =
  | "auth"
  | "medicines"
  | "patients"
  | "appointments"
  | "prescriptions"
  | "dashboard"
  | "clinics";

export type Endpoint = {
  id: string;
  module: ModuleKey;
  method: HttpMethod;
  path: string;
  summary: string;
  defaultBody?: string;
  pathParams?: string[];
  queryParams?: string[];
};

export const moduleMeta: Record<
  ModuleKey,
  {
    label: string;
    headline: string;
    description: string;
  }
> = {
  auth: {
    label: "Auth",
    headline: "Authentication And User Management",
    description: "จัดการการล็อกอิน, user และ role ของระบบ",
  },
  medicines: {
    label: "Medicines",
    headline: "Medicine Inventory",
    description: "เพิ่ม, แก้ไข, ค้นหา และจัดการสต็อกยา",
  },
  patients: {
    label: "Patients",
    headline: "Patient Records",
    description: "บันทึกและค้นหาข้อมูลผู้ป่วย",
  },
  appointments: {
    label: "Appointments",
    headline: "Appointment Flow",
    description: "สร้างนัดหมาย, อัปเดตสถานะ และลบนัดหมาย",
  },
  prescriptions: {
    label: "Prescriptions",
    headline: "Prescription And Stock Cut",
    description: "ออกใบสั่งยาและตัด/คืนสต็อกแบบอัตโนมัติ",
  },
  dashboard: {
    label: "Dashboard",
    headline: "Business Insight APIs",
    description: "ดูรายงานยอดขาย, สต็อก และข้อมูลสรุป",
  },
  clinics: {
    label: "Clinics",
    headline: "Geospatial Search",
    description: "ค้นหาคลินิกใกล้ตำแหน่งด้วยพิกัด",
  },
};

export const moduleOrder: ModuleKey[] = [
  "auth",
  "medicines",
  "patients",
  "appointments",
  "prescriptions",
  "dashboard",
  "clinics",
];

export const endpoints: Endpoint[] = [
  {
    id: "auth-login",
    module: "auth",
    method: "POST",
    path: "/auth/login",
    summary: "ล็อกอินผู้ใช้",
    defaultBody: JSON.stringify({ username: "admin", password: "1234" }, null, 2),
  },
  {
    id: "auth-register",
    module: "auth",
    method: "POST",
    path: "/auth/register",
    summary: "สร้างผู้ใช้ใหม่ (admin)",
    defaultBody: JSON.stringify({ username: "doctor1", password: "1234", role: "doctor", name: "Dr. New" }, null, 2),
  },
  { id: "auth-users", module: "auth", method: "GET", path: "/auth/users", summary: "ดูผู้ใช้ทั้งหมด (admin)" },
  {
    id: "auth-role",
    module: "auth",
    method: "PUT",
    path: "/auth/users/:id/role",
    summary: "เปลี่ยน role ผู้ใช้",
    pathParams: ["id"],
    defaultBody: JSON.stringify({ role: "doctor" }, null, 2),
  },
  {
    id: "auth-delete",
    module: "auth",
    method: "DELETE",
    path: "/auth/users/:id",
    summary: "ลบผู้ใช้",
    pathParams: ["id"],
  },

  {
    id: "medicines-create",
    module: "medicines",
    method: "POST",
    path: "/medicines",
    summary: "เพิ่มยา",
    defaultBody: JSON.stringify(
      {
        name: "Paracetamol",
        category: "Pain Relief",
        stock: 120,
        price: 35,
        expire_date: "2026-12-31",
      },
      null,
      2,
    ),
  },
  { id: "medicines-list", module: "medicines", method: "GET", path: "/medicines", summary: "ดูยาทั้งหมด" },
  {
    id: "medicines-alert",
    module: "medicines",
    method: "GET",
    path: "/medicines/alert/low-stock",
    summary: "ดูรายการยาสต็อกต่ำ",
  },
  {
    id: "medicines-search-text",
    module: "medicines",
    method: "GET",
    path: "/medicines/search/text/:keyword",
    summary: "ค้นหาด้วย full-text",
    pathParams: ["keyword"],
  },
  {
    id: "medicines-search-regex",
    module: "medicines",
    method: "GET",
    path: "/medicines/search/regex/:keyword",
    summary: "ค้นหาด้วย regex",
    pathParams: ["keyword"],
  },
  {
    id: "medicines-category",
    module: "medicines",
    method: "GET",
    path: "/medicines/category/:category",
    summary: "กรองตามหมวดหมู่",
    pathParams: ["category"],
  },
  {
    id: "medicines-get",
    module: "medicines",
    method: "GET",
    path: "/medicines/:id",
    summary: "ดูยาตาม ID",
    pathParams: ["id"],
  },
  {
    id: "medicines-stock",
    module: "medicines",
    method: "PATCH",
    path: "/medicines/:id/stock",
    summary: "เติมสต็อกยา",
    pathParams: ["id"],
    defaultBody: JSON.stringify({ amount: 10 }, null, 2),
  },
  {
    id: "medicines-update",
    module: "medicines",
    method: "PUT",
    path: "/medicines/:id",
    summary: "แก้ไขข้อมูลยา",
    pathParams: ["id"],
    defaultBody: JSON.stringify({ price: 42, stock: 140 }, null, 2),
  },
  {
    id: "medicines-delete",
    module: "medicines",
    method: "DELETE",
    path: "/medicines/:id",
    summary: "ลบยา",
    pathParams: ["id"],
  },

  {
    id: "patients-create",
    module: "patients",
    method: "POST",
    path: "/patients",
    summary: "เพิ่มผู้ป่วย",
    defaultBody: JSON.stringify({ name: "Somchai", age: 32, phone: "0812345678" }, null, 2),
  },
  { id: "patients-list", module: "patients", method: "GET", path: "/patients", summary: "ดูผู้ป่วยทั้งหมด" },
  {
    id: "patients-search",
    module: "patients",
    method: "GET",
    path: "/patients/search/:name",
    summary: "ค้นหาผู้ป่วยตามชื่อ",
    pathParams: ["name"],
  },
  {
    id: "patients-get",
    module: "patients",
    method: "GET",
    path: "/patients/:id",
    summary: "ดูผู้ป่วยตาม ID",
    pathParams: ["id"],
  },
  {
    id: "patients-update",
    module: "patients",
    method: "PUT",
    path: "/patients/:id",
    summary: "แก้ไขข้อมูลผู้ป่วย",
    pathParams: ["id"],
    defaultBody: JSON.stringify({ phone: "0899999999" }, null, 2),
  },
  {
    id: "patients-delete",
    module: "patients",
    method: "DELETE",
    path: "/patients/:id",
    summary: "ลบผู้ป่วย",
    pathParams: ["id"],
  },

  {
    id: "appointments-create",
    module: "appointments",
    method: "POST",
    path: "/appointments",
    summary: "สร้างนัดหมาย",
    defaultBody: JSON.stringify(
      { patient_name: "Somchai", date: "2026-04-01", time: "10:30", status: "pending" },
      null,
      2,
    ),
  },
  {
    id: "appointments-list",
    module: "appointments",
    method: "GET",
    path: "/appointments",
    summary: "ดูนัดหมายทั้งหมด",
  },
  {
    id: "appointments-status",
    module: "appointments",
    method: "PATCH",
    path: "/appointments/:id/status",
    summary: "อัปเดตสถานะนัดหมาย",
    pathParams: ["id"],
    defaultBody: JSON.stringify({ status: "done" }, null, 2),
  },
  {
    id: "appointments-delete",
    module: "appointments",
    method: "DELETE",
    path: "/appointments/:id",
    summary: "ลบนัดหมาย",
    pathParams: ["id"],
  },

  {
    id: "prescriptions-create",
    module: "prescriptions",
    method: "POST",
    path: "/prescriptions",
    summary: "สร้างใบสั่งยาและตัดสต็อก",
    defaultBody: JSON.stringify(
      {
        patient_name: "Somchai",
        issued_date: "2026-04-01",
        total_price: 140,
        medicines: [
          { name: "Paracetamol", qty: 2 },
          { name: "Amoxicillin", qty: 1 },
        ],
      },
      null,
      2,
    ),
  },
  {
    id: "prescriptions-list",
    module: "prescriptions",
    method: "GET",
    path: "/prescriptions",
    summary: "ดูใบสั่งยาทั้งหมด",
  },
  {
    id: "prescriptions-patient",
    module: "prescriptions",
    method: "GET",
    path: "/prescriptions/patient/:name",
    summary: "ดูใบสั่งยาตามชื่อผู้ป่วย",
    pathParams: ["name"],
  },
  {
    id: "prescriptions-cancel",
    module: "prescriptions",
    method: "DELETE",
    path: "/prescriptions/:id/cancel",
    summary: "ยกเลิกใบสั่งยาและคืนสต็อก",
    pathParams: ["id"],
  },

  {
    id: "dashboard-top",
    module: "dashboard",
    method: "GET",
    path: "/dashboard/top-medicines",
    summary: "ยาขายดี Top 5",
  },
  {
    id: "dashboard-revenue",
    module: "dashboard",
    method: "GET",
    path: "/dashboard/monthly-revenue",
    summary: "รายได้รายเดือน",
  },
  {
    id: "dashboard-stock-summary",
    module: "dashboard",
    method: "GET",
    path: "/dashboard/stock-summary",
    summary: "สรุปสต็อกตามหมวด",
  },
  {
    id: "dashboard-expiring",
    module: "dashboard",
    method: "GET",
    path: "/dashboard/expiring-soon",
    summary: "ยาใกล้หมดอายุ",
  },
  {
    id: "dashboard-low-stock",
    module: "dashboard",
    method: "GET",
    path: "/dashboard/low-stock",
    summary: "ยาสต็อกน้อยกว่า 50",
  },

  {
    id: "clinics-nearby",
    module: "clinics",
    method: "GET",
    path: "/clinics/nearby",
    summary: "ค้นหาคลินิกใกล้พิกัด",
    queryParams: ["lng", "lat", "distance"],
  },
];

export function getEndpointsByModule(module: ModuleKey): Endpoint[] {
  return endpoints.filter((item) => item.module === module);
}

export function buildPath(endpoint: Endpoint, pathValues: Record<string, string>) {
  let finalPath = endpoint.path;
  for (const key of endpoint.pathParams ?? []) {
    finalPath = finalPath.replace(`:${key}`, encodeURIComponent(pathValues[key] ?? ""));
  }
  return finalPath;
}

export function buildQuery(endpoint: Endpoint, queryValues: Record<string, string>) {
  const params = new URLSearchParams();
  for (const key of endpoint.queryParams ?? []) {
    const value = queryValues[key]?.trim();
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
