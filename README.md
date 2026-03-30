# Pharmacy Clinic Management System

ระบบบริหารจัดการร้านยาและคลินิก ประกอบด้วย

- Frontend: Next.js (App Router) + React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + MongoDB

รองรับการใช้งานแบบแบ่งสิทธิ์ (Role-based)

- Admin: จัดการผู้ใช้, จัดการยา, ดูรายงาน Dashboard
- Doctor: จัดการผู้ป่วย, นัดหมาย, ใบสั่งยา และตัดสต็อกอัตโนมัติ

## 1. ความสามารถหลักของระบบ

- Authentication และ Authorization ตามบทบาทผู้ใช้
- จัดการข้อมูลผู้ใช้ (Admin)
- จัดการรายการยาและสต็อก (Admin)
- จัดการผู้ป่วยและนัดหมาย (Doctor)
- ออกใบสั่งยาและคำนวณราคารวม พร้อมตัดสต็อกอัตโนมัติ (Doctor)
- รายงานเชิงปฏิบัติการ เช่น Top Medicines, Monthly Revenue, Stock Summary (Admin)

## 2. โครงสร้างโปรเจกต์

```text
pharmacy_clinic/
|- src/                 # Frontend (Next.js)
|- public/              # Static assets
|- backend/             # Backend API (Express + MongoDB)
|  |- server.js
|  |- db.js
|  |- package.json
|- package.json         # Frontend scripts/dependencies
|- README.md
```

## 3. ข้อกำหนดระบบ (Prerequisites)

- Node.js 20 ขึ้นไป
- npm 10 ขึ้นไป
- MongoDB (Local หรือ MongoDB Atlas)

## 4. การติดตั้งระบบ

### 4.1 ติดตั้ง Frontend dependencies

จากโฟลเดอร์รากของโปรเจกต์:

```bash
npm install
```

### 4.2 ติดตั้ง Backend dependencies

เข้าไปที่โฟลเดอร์ backend:

```bash
cd backend
npm install
```

## 5. การตั้งค่า Environment Variables

สร้างไฟล์ `backend/.env` และกำหนดค่าอย่างน้อยดังนี้:

```env
MONGO_URL=<your_mongodb_connection_string>
DB_NAME=<your_database_name>
PORT=3030
FRONTEND_URL=http://localhost:3000
```

หมายเหตุสำคัญ

- ห้าม commit ไฟล์ `.env` ขึ้น Git
- โปรเจกต์นี้ตั้งค่า `.gitignore` ให้ ignore `.env*` แล้ว

## 6. วิธีรันระบบ (Development)

ต้องเปิด 2 terminal แยกกัน

### Terminal A: รัน Backend API

```bash
cd backend
npm run dev
```

Backend จะเริ่มทำงานที่:

- `http://localhost:3030` (หรือพอร์ตตาม `PORT` ใน `.env`)

### Terminal B: รัน Frontend

จากโฟลเดอร์รากของโปรเจกต์:

```bash
npm run dev
```

Frontend จะเริ่มทำงานที่:

- `http://localhost:3000`

## 7. คำสั่งสำคัญ

### Frontend (โฟลเดอร์ราก)

```bash
npm run dev      # รันโหมดพัฒนา
npm run build    # build สำหรับ production
npm run start    # รัน production build
npm run lint     # ตรวจ lint
```

### Backend (โฟลเดอร์ backend)

```bash
npm run dev      # รัน backend
npm run start    # รัน backend
```

## 8. แนวทางการ Deploy โดยย่อ

- Deploy Frontend และ Backend แยกกัน
- ตั้งค่า Environment Variables ให้ตรงตามสภาพแวดล้อมจริง
- เปิด CORS ฝั่ง Backend ด้วยค่า `FRONTEND_URL` ของระบบจริง
- ตรวจสอบการเชื่อมต่อ MongoDB และสิทธิ์ฐานข้อมูลก่อนเปิดใช้งาน

## 9. ปัญหาที่พบบ่อย

### Backend รันไม่ขึ้น

- ตรวจสอบว่า `backend/.env` มี `MONGO_URL` และ `DB_NAME`
- ตรวจสอบว่า MongoDB เข้าถึงได้จริง

### Login ไม่สำเร็จ

- ตรวจสอบว่า Backend ทำงานอยู่ที่พอร์ตที่ถูกต้อง
- ตรวจสอบว่า Frontend เรียก API base ถูกต้อง

### CORS Error

- ตรวจสอบค่า `FRONTEND_URL` ใน `backend/.env` ให้ตรงกับ URL ของ Frontend

## 10. ข้อควรปฏิบัติด้านความปลอดภัย

- ไม่เก็บข้อมูลลับไว้ในโค้ด
- ไม่ commit `.env` หรือ credentials ใดๆ
- จำกัดสิทธิ์ผู้ใช้ตามบทบาทอย่างเคร่งครัด
- ตรวจสอบและ sanitize ข้อมูลก่อนบันทึกลงฐานข้อมูล

---

หากต้องการเอกสาร API แบบละเอียด (Endpoint/Request/Response) สามารถเพิ่มส่วน API Reference ต่อจากเอกสารนี้ได้ทันที
