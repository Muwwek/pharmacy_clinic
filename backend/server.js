// ============================================================================
// 🏥 CLINIC MANAGEMENT API - Backend Server
// เทคโนโลยี: Node.js + Express + MongoDB
// ============================================================================

// =============================================
// 📦 IMPORT MODULES ที่จำเป็น
// =============================================
const express = require('express')                    // Framework สำหรับสร้าง Web Server/API
const { MongoClient, ObjectId } = require('mongodb')  // Driver สำหรับเชื่อมต่อและจัดการ MongoDB
const crypto = require('crypto')                      // Module สำหรับเข้ารหัส (ใช้ hash รหัสผ่าน)
const cors = require('cors')                          // Middleware อนุญาตให้ Frontend เรียก API ข้ามโดเมน
require('dotenv').config()                            // โหลดตัวแปรจากไฟล์ .env เข้าสู่ process.env

// =============================================
// 🚀 INITIALIZE EXPRESS APP
// =============================================
const app = express()                                 // สร้าง instance ของ Express application

// ตั้งค่า CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // อนุญาตเฉพาะ frontend ที่กำหนด
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // อนุญาตเฉพาะ HTTP methods ที่ระบุ
  allowedHeaders: ['Content-Type', 'username']                   // อนุญาตเฉพาะ header ที่ระบุ
}))

app.use(express.json())                               // Middleware แปลง JSON body ใน request เป็น JavaScript object

// =============================================
// 🗄️ MONGODB CONNECTION SETUP
// =============================================
const client = new MongoClient(process.env.MONGO_URL) // สร้าง MongoDB client ด้วย connection string จาก .env
let db                                                // ตัวแปรเก็บ reference ของ database ที่เชื่อมต่อแล้ว

// ฟังก์ชันเชื่อมต่อฐานข้อมูลแบบ async
async function connectDB() {
  try {
    await client.connect()                            // เชื่อมต่อจริงกับ MongoDB
    db = client.db(process.env.DB_NAME)               // เลือกใช้ database ตามชื่อที่กำหนดใน .env
    console.log('✅ MongoDB Connected')                // แสดงผลเมื่อเชื่อมต่อสำเร็จ
  } catch (err) {
    console.error('❌ MongoDB Error:', err)            // แสดงข้อผิดพลาดหากเชื่อมต่อล้มเหลว
    process.exit(1)                                   // หยุดกระบวนการทำงานของโปรแกรม (exit code 1 = error)
  }
}

// =============================================
// 🔐 HELPER FUNCTIONS
// =============================================
// ฟังก์ชันเข้ารหัสรหัสผ่านด้วย SHA-256
// รับพารามิเตอร์: password (string)
// ส่งคืน: รหัสผ่านที่ถูก hash เป็น hex string
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
  // createHash('sha256'): สร้าง hasher ด้วยอัลกอริทึม SHA-256
  // update(password): ใส่ข้อมูลที่ต้องการเข้ารหัส
  // digest('hex'): แปลงผลลัพธ์เป็น string แบบ hexadecimal
}

// =============================================
// 🛡️ ROLE-BASED ACCESS CONTROL MIDDLEWARES
// =============================================

// ✅ Middleware: ตรวจสอบว่าเป็น Admin เท่านั้น
async function requireAdmin(req, res, next) {
  const username = req.headers['username']            // ดึง username จาก HTTP header (ไม่ใช่ body เพื่อความปลอดภัย)
  
  // ถ้าไม่มี username ใน header → ตอบกลับ 401 Unauthorized
  if (!username) return res.status(401).json({ error: 'กรุณาใส่ username ใน Header' })

  // ค้นหา user ใน collection 'users' ตาม username ที่ส่งมา
  const user = await db.collection('users').findOne({ username })
  
  // ถ้าไม่พบ user → ตอบกลับ 401
  if (!user) return res.status(401).json({ error: 'ไม่พบ User' })
  
  // ถ้า role ของ user ไม่ใช่ 'admin' → ตอบกลับ 403 Forbidden
  if (user.role !== 'admin') return res.status(403).json({ error: '⛔ สิทธิ์ Admin เท่านั้น' })

  // ถ้าผ่านทั้งหมด: เก็บข้อมูล user ไว้ใน req.user เพื่อให้ route ถัดไปใช้ได้
  req.user = user
  next()                                              // เรียก next() เพื่อส่งต่อการทำงานไปยัง handler ถัดไป
}

// ✅ Middleware: ตรวจสอบว่าเป็น Doctor เท่านั้น
async function requireDoctor(req, res, next) {
  const username = req.headers['username']
  if (!username) return res.status(401).json({ error: 'กรุณาใส่ username ใน Header' })

  const user = await db.collection('users').findOne({ username })
  if (!user) return res.status(401).json({ error: 'ไม่พบ User' })
  
  // ตรวจสอบว่า role ต้องเป็น 'doctor' เท่านั้น
  if (user.role !== 'doctor') return res.status(403).json({ error: '⛔ สิทธิ์ Doctor เท่านั้น' })

  req.user = user
  next()
}

// ✅ Middleware: ตรวจสอบว่าเป็น Admin หรือ Doctor (อย่างใดอย่างหนึ่ง)
async function requireAny(req, res, next) {
  const username = req.headers['username']
  if (!username) return res.status(401).json({ error: 'กรุณาใส่ username ใน Header' })

  const user = await db.collection('users').findOne({ username })
  if (!user) return res.status(401).json({ error: 'ไม่พบ User' })
  
  // ตรวจสอบว่า role ต้องอยู่ใน array ['admin', 'doctor']
  if (!['admin', 'doctor'].includes(user.role)) return res.status(403).json({ error: '⛔ ไม่มีสิทธิ์' })

  req.user = user
  next()
}

// =============================================
// 🔑 AUTH ROUTES — Login + User Management (Admin)
// =============================================

// ✅ POST /auth/login — เข้าสู่ระบบ (ทุกคนใช้ได้)
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body           // ดึง username และ password จาก request body
    
    // ค้นหา user โดยเทียบ username และรหัสผ่านที่ถูก hash แล้ว
    const user = await db.collection('users').findOne({
      username,
      password: hashPassword(password)                // hash รหัสผ่านที่รับมาก่อนเทียบกับในฐานข้อมูล
    })
    
    // ถ้าไม่พบ user ที่ตรงกัน → ตอบกลับ 401 (ไม่ระบุว่าผิดอะไรเพื่อป้องกัน enumeration attack)
    if (!user) return res.status(401).json({ error: 'username หรือ password ไม่ถูกต้อง' })

    // ถ้าพบ: ส่งข้อมูลผู้ใช้กลับ (ไม่ส่ง password กลับเพื่อความปลอดภัย)
    res.json({ 
      message: 'เข้าสู่ระบบสำเร็จ', 
      username: user.username, 
      role: user.role, 
      name: user.name 
    })
  } catch (err) {
    // ถ้าเกิดข้อผิดพลาดในระบบ → ตอบกลับ 500 Internal Server Error
    res.status(500).json({ error: err.message })
  }
})

// ✅ POST /auth/register — สร้าง user ใหม่ (เฉพาะ Admin)
app.post('/auth/register', requireAdmin, async (req, res) => {
  try {
    const { username, password, role, name } = req.body
    
    // ตรวจสอบว่า username นี้มีในระบบแล้วหรือไม่
    const existing = await db.collection('users').findOne({ username })
    if (existing) return res.status(400).json({ error: 'มี username นี้แล้ว' })
    
    // ตรวจสอบว่า role ต้องเป็น 'admin' หรือ 'doctor' เท่านั้น
    if (!['admin', 'doctor'].includes(role)) return res.status(400).json({ error: 'role ต้องเป็น admin หรือ doctor' })

    // บันทึก user ใหม่ลง collection 'users'
    const result = await db.collection('users').insertOne({
      username, 
      password: hashPassword(password),  // hash รหัสผ่านก่อนเก็บ
      role, 
      name
    })
    
    // ส่งกลับข้อความสำเร็จและ ID ของ document ที่สร้างใหม่
    res.json({ message: 'สร้าง User สำเร็จ', id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /auth/users — ดู user ทั้งหมด (เฉพาะ Admin)
app.get('/auth/users', requireAdmin, async (req, res) => {
  try {
    // ค้นหา user ทั้งหมด โดยไม่ส่งฟิลด์ password กลับไป (projection: { password: 0 })
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray()
    res.json(users)                                     // ส่ง array ของ users กลับเป็น JSON
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ PUT /auth/users/:id — แก้ไขข้อมูล user (เฉพาะ Admin)
app.put('/auth/users/:id', requireAdmin, async (req, res) => {
  try {
    const { username, password, role, name } = req.body
    const userId = new ObjectId(req.params.id)          // แปลง string ID จาก URL เป็น ObjectId ของ MongoDB
    const updates = {}                                  // object สำหรับเก็บฟิลด์ที่ต้องการอัปเดต

    // ===== ตรวจสอบและเตรียมอัปเดตฟิลด์ username =====
    if (typeof username !== 'undefined') {
      const nextUsername = String(username).trim()      // ลบช่องว่างหัวท้าย
      if (!nextUsername) return res.status(400).json({ error: 'username ห้ามว่าง' })

      // ตรวจสอบว่า username ใหม่ไม่ซ้ำกับ user คนอื่น (ยกเว้นตัวเอง)
      const existing = await db.collection('users').findOne({
        username: nextUsername,
        _id: { $ne: userId }                            // $ne = not equal, ยกเว้น _id ของตัวเอง
      })
      if (existing) return res.status(400).json({ error: 'มี username นี้แล้ว' })
      updates.username = nextUsername
    }

    // ===== ตรวจสอบและเตรียมอัปเดตฟิลด์ name =====
    if (typeof name !== 'undefined') {
      const nextName = String(name).trim()
      if (!nextName) return res.status(400).json({ error: 'name ห้ามว่าง' })
      updates.name = nextName
    }

    // ===== ตรวจสอบและเตรียมอัปเดตฟิลด์ role =====
    if (typeof role !== 'undefined') {
      if (!['admin', 'doctor'].includes(role)) {
        return res.status(400).json({ error: 'role ต้องเป็น admin หรือ doctor' })
      }
      updates.role = role
    }

    // ===== ตรวจสอบและเตรียมอัปเดตฟิลด์ password =====
    if (typeof password !== 'undefined' && String(password).trim() !== '') {
      updates.password = hashPassword(String(password))  // hash รหัสผ่านใหม่ก่อนเก็บ
    }

    // ถ้าไม่มีฟิลด์ใดให้อัปเดต → ตอบกลับ 400
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลสำหรับอัปเดต' })
    }

    // อัปเดตข้อมูลในฐานข้อมูลด้วย $set
    const result = await db.collection('users').updateOne(
      { _id: userId },
      { $set: updates }
    )

    // ถ้าไม่พบ document ที่ตรงกัน → ตอบกลับ 404
    if (result.matchedCount === 0) return res.status(404).json({ error: 'ไม่พบ User' })
    res.json({ message: 'อัปเดต User สำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ PUT /auth/users/:id/role — เปลี่ยน role ของ user (เฉพาะ Admin)
app.put('/auth/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body
    // ตรวจสอบว่า role ใหม่ต้องถูกต้อง
    if (!['admin', 'doctor'].includes(role)) return res.status(400).json({ error: 'role ไม่ถูกต้อง' })

    // อัปเดตเฉพาะฟิลด์ role ด้วย $set
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { role } }
    )
    res.json({ message: 'เปลี่ยน Role สำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ DELETE /auth/users/:id — ลบ user (เฉพาะ Admin)
app.delete('/auth/users/:id', requireAdmin, async (req, res) => {
  try {
    // ลบ document ที่มี _id ตรงกันออกจาก collection 'users'
    await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ message: 'ลบ User สำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 💊 MEDICINES ROUTES — จัดการข้อมูลยา
// =============================================

// ✅ POST /medicines — เพิ่มยาใหม่ (เฉพาะ Admin)
app.post('/medicines', requireAdmin, async (req, res) => {
  try {
    // insertOne: เพิ่ม document ใหม่ลง collection 'medicines' ด้วยข้อมูลจาก req.body
    const result = await db.collection('medicines').insertOne(req.body)
    res.json({ message: 'เพิ่มยาสำเร็จ', id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /medicines — ดูยาทั้งหมด (Admin + Doctor)
app.get('/medicines', requireAny, async (req, res) => {
  try {
    // find(): ค้นหาทั้งหมด, toArray(): แปลง cursor เป็น array
    const medicines = await db.collection('medicines').find().toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /medicines/alert/low-stock — ดูยาสต็อคน้อย (< 50) (Admin + Doctor)
app.get('/medicines/alert/low-stock', requireAny, async (req, res) => {
  try {
    // $lt = less than: ค้นหาเอกสารที่ฟิลด์ stock มีค่าน้อยกว่า 50
    const medicines = await db.collection('medicines').find({ stock: { $lt: 50 } }).toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /medicines/search/text/:keyword — ค้นหาด้วย Text Index ($text) (Admin + Doctor)
// หมายเหตุ: ต้องสร้าง text index ที่ collection 'medicines' ก่อน: db.medicines.createIndex({ name: "text", description: "text" })
app.get('/medicines/search/text/:keyword', requireAny, async (req, res) => {
  try {
    const medicines = await db.collection('medicines')
      .find({ $text: { $search: req.params.keyword } })  // $text: ใช้ full-text search, $search: คำค้น
      .toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /medicines/search/regex/:keyword — ค้นหาด้วย Regular Expression (Admin + Doctor)
app.get('/medicines/search/regex/:keyword', requireAny, async (req, res) => {
  try {
    const medicines = await db.collection('medicines')
      // $regex: ค้นหาคำที่ตรงกับรูปแบบ, $options: 'i' = case-insensitive (ไม่สนใจตัวพิมพ์ใหญ่-เล็ก)
      .find({ name: { $regex: req.params.keyword, $options: 'i' } })
      .toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /medicines/category/:category — กรองยาตามหมวดหมู่ (Admin + Doctor)
app.get('/medicines/category/:category', requireAny, async (req, res) => {
  try {
    const medicines = await db.collection('medicines')
      .find({ category: req.params.category })           // ค้นหาเอกสารที่ฟิลด์ category ตรงกับพารามิเตอร์
      .toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /medicines/:id — ดูข้อมูลยาตาม ID (Admin + Doctor)
app.get('/medicines/:id', requireAny, async (req, res) => {
  try {
    // findOne: ค้นหาเอกสารเดียวที่ _id ตรงกัน (ต้องแปลงเป็น ObjectId ก่อน)
    const medicine = await db.collection('medicines').findOne({ _id: new ObjectId(req.params.id) })
    if (!medicine) return res.status(404).json({ error: 'ไม่พบยา' })  // ถ้าไม่พบ → 404
    res.json(medicine)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ PATCH /medicines/:id/stock — เติม/ลด สต็อคยา (เฉพาะ Admin)
app.patch('/medicines/:id/stock', requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body // amount: จำนวนที่ต้องการเพิ่ม (+) หรือลด (-)
    
    // $inc = increment: เพิ่ม/ลด ค่าของฟิลด์โดยตรง (เหมาะสำหรับการอัปเดตตัวเลข)
    await db.collection('medicines').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $inc: { stock: amount } }
    )
    res.json({ message: `เติมสต็อค ${amount} หน่วยสำเร็จ` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ PUT /medicines/:id — แก้ไขข้อมูลยาทั้งหมด (เฉพาะ Admin)
app.put('/medicines/:id', requireAdmin, async (req, res) => {
  try {
    // $set: แทนที่ค่าของฟิลด์ทั้งหมดด้วยข้อมูลใหม่จาก req.body
    await db.collection('medicines').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    )
    res.json({ message: 'แก้ไขข้อมูลยาสำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ DELETE /medicines/:id — ลบยา (เฉพาะ Admin)
app.delete('/medicines/:id', requireAdmin, async (req, res) => {
  try {
    // deleteOne: ลบเอกสารเดียวที่ _id ตรงกัน
    await db.collection('medicines').deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ message: 'ลบยาสำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 👥 PATIENTS ROUTES — จัดการข้อมูลผู้ป่วย (Doctor)
// =============================================

// ✅ POST /patients — เพิ่มผู้ป่วยใหม่ (เฉพาะ Doctor)
app.post('/patients', requireDoctor, async (req, res) => {
  try {
    const result = await db.collection('patients').insertOne(req.body)
    res.json({ message: 'เพิ่มผู้ป่วยสำเร็จ', id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /patients — ดูผู้ป่วยทั้งหมด (เฉพาะ Doctor)
app.get('/patients', requireDoctor, async (req, res) => {
  try {
    const patients = await db.collection('patients').find().toArray()
    res.json(patients)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /patients/search/:name — ค้นหาผู้ป่วยตามชื่อ (เฉพาะ Doctor)
app.get('/patients/search/:name', requireDoctor, async (req, res) => {
  try {
    const patients = await db.collection('patients')
      // $regex + $options: 'i' = ค้นหาชื่อที่ตรงกับคำค้น โดยไม่สนใจตัวพิมพ์ใหญ่-เล็ก
      .find({ name: { $regex: req.params.name, $options: 'i' } })
      .toArray()
    res.json(patients)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /patients/:id — ดูข้อมูลผู้ป่วยตาม ID (เฉพาะ Doctor)
app.get('/patients/:id', requireDoctor, async (req, res) => {
  try {
    const patient = await db.collection('patients').findOne({ _id: new ObjectId(req.params.id) })
    if (!patient) return res.status(404).json({ error: 'ไม่พบผู้ป่วย' })
    res.json(patient)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ PUT /patients/:id — อัปเดตข้อมูลผู้ป่วย (เฉพาะ Doctor)
app.put('/patients/:id', requireDoctor, async (req, res) => {
  try {
    await db.collection('patients').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }                                // $set: อัปเดตฟิลด์ทั้งหมดด้วยข้อมูลใหม่
    )
    res.json({ message: 'อัปเดตข้อมูลผู้ป่วยสำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ DELETE /patients/:id — ลบผู้ป่วย (เฉพาะ Doctor)
app.delete('/patients/:id', requireDoctor, async (req, res) => {
  try {
    await db.collection('patients').deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ message: 'ลบผู้ป่วยสำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 📅 APPOINTMENTS ROUTES — จัดการนัดหมาย (Doctor)
// =============================================

// ✅ POST /appointments — สร้างนัดหมายใหม่ (เฉพาะ Doctor)
app.post('/appointments', requireDoctor, async (req, res) => {
  try {
    const result = await db.collection('appointments').insertOne(req.body)
    res.json({ message: 'สร้างนัดหมายสำเร็จ', id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /appointments — ดูนัดหมายทั้งหมด + ข้อมูลผู้ป่วย (เฉพาะ Doctor)
app.get('/appointments', requireDoctor, async (req, res) => {
  try {
    // Aggregate Pipeline: ใช้สำหรับ join ข้อมูลจากหลาย collection
    const appointments = await db.collection('appointments').aggregate([
      {
        // $lookup: ทำการ join กับ collection 'patients'
        $lookup: {
          from: 'patients',                              // collection ที่จะ join ด้วย
          localField: 'patient_name',                    // ฟิลด์ใน collection ปัจจุบัน (appointments)
          foreignField: 'name',                          // ฟิลด์ใน collection ที่ join (patients)
          as: 'patient_info'                             // ชื่อฟิลด์ใหม่ที่จะเก็บผลลัพธ์การ join (เป็น array)
        }
      },
      { $sort: { date: 1 } }                            // เรียงลำดับตามวันที่จากเก่าไปใหม่ (1 = ascending)
    ]).toArray()
    res.json(appointments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ PATCH /appointments/:id/status — อัปเดตสถานะนัดหมาย (เฉพาะ Doctor)
app.patch('/appointments/:id/status', requireDoctor, async (req, res) => {
  try {
    const { status } = req.body
    // ตรวจสอบว่า status ต้องเป็นหนึ่งในค่าที่กำหนด
    if (!['pending', 'done', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'status ต้องเป็น pending, done หรือ cancelled' })
    }
    
    // อัปเดตเฉพาะฟิลด์ status
    await db.collection('appointments').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } }
    )
    res.json({ message: 'อัปเดตสถานะสำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ DELETE /appointments/:id — ลบนัดหมาย (เฉพาะ Doctor)
app.delete('/appointments/:id', requireDoctor, async (req, res) => {
  try {
    await db.collection('appointments').deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ message: 'ลบนัดหมายสำเร็จ' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 💊 PRESCRIPTIONS ROUTES — ใบสั่งยา + ตัดสต็อคอัตโนมัติ
// =============================================

// ✅ POST /prescriptions — สร้างใบสั่งยา + ตัดสต็อคอัตโนมัติ (เฉพาะ Doctor)
app.post('/prescriptions', requireDoctor, async (req, res) => {
  try {
    const { medicines } = req.body                       // medicines: array ของยาที่สั่ง [{ name, qty }, ...]

    // ===== STEP 1: เช็คสต็อคทุกตัวก่อนว่าเพียงพอหรือไม่ =====
    const notEnough = []                                 // array เก็บรายการยาที่สต็อคไม่พอ
    for (const med of medicines) {
      const medicine = await db.collection('medicines').findOne({ name: med.name })
      if (!medicine) return res.status(404).json({ error: `ไม่พบยา: ${med.name}` })
      
      // ถ้าสต็อคที่มี < จำนวนที่ขอ → เพิ่มเข้าลิสต์ไม่พอ
      if (medicine.stock < med.qty) {
        notEnough.push({
          name: medicine.name,
          stock_remaining: medicine.stock,
          qty_requested: med.qty
        })
      }
    }

    // ถ้ามียาใดไม่พอ → หยุดทันทีและตอบกลับ 400 พร้อมรายการยาที่ขาด
    if (notEnough.length > 0) {
      return res.status(400).json({
        message: 'ยาบางรายการมีสต็อคไม่เพียงพอ',
        items: notEnough
      })
    }

    // ===== STEP 2: ตัดสต็อคทุกตัว (ใช้ $inc เพื่อลดค่า) =====
    for (const med of medicines) {
      await db.collection('medicines').updateOne(
        { name: med.name },
        { $inc: { stock: -med.qty } }                    // ลดสต็อคด้วยค่าติดลบ: stock = stock - qty
      )
    }

    // ===== STEP 3: บันทึกใบสั่งยาลงฐานข้อมูล =====
    const result = await db.collection('prescriptions').insertOne(req.body)
    res.json({ message: 'สร้างใบสั่งยาสำเร็จ ตัดสต็อคเรียบร้อย', id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /prescriptions — ดูใบสั่งยาทั้งหมด + ข้อมูลผู้ป่วย (Admin + Doctor)
app.get('/prescriptions', requireAny, async (req, res) => {
  try {
    const prescriptions = await db.collection('prescriptions').aggregate([
      {
        // $lookup: join กับ collection 'patients' เพื่อแสดงข้อมูลผู้ป่วย
        $lookup: {
          from: 'patients',
          localField: 'patient_name',
          foreignField: 'name',
          as: 'patient_info'
        }
      },
      { $sort: { issued_date: -1 } }                    // เรียงตามวันที่ออกใบสั่งยาจากใหม่ไปเก่า (-1 = descending)
    ]).toArray()
    res.json(prescriptions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /prescriptions/patient/:name — ดูใบสั่งยาของผู้ป่วยคนหนึ่ง (เฉพาะ Doctor)
app.get('/prescriptions/patient/:name', requireDoctor, async (req, res) => {
  try {
    const prescriptions = await db.collection('prescriptions')
      .find({ patient_name: req.params.name })           // ค้นหาตามชื่อผู้ป่วย
      .sort({ issued_date: -1 })                         // เรียงจากใหม่ไปเก่า
      .toArray()
    res.json(prescriptions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ DELETE /prescriptions/:id/cancel — ยกเลิกใบสั่งยา + คืนสต็อคอัตโนมัติ (เฉพาะ Doctor)
app.delete('/prescriptions/:id/cancel', requireDoctor, async (req, res) => {
  try {
    // ดึงข้อมูลใบสั่งยาที่จะยกเลิก
    const prescription = await db.collection('prescriptions').findOne({ _id: new ObjectId(req.params.id) })
    if (!prescription) return res.status(404).json({ error: 'ไม่พบใบสั่งยา' })

    // ===== คืนสต็อคทุกตัวในใบสั่งยา (ใช้ $inc เพื่อเพิ่มค่ากลับ) =====
    for (const med of prescription.medicines) {
      await db.collection('medicines').updateOne(
        { name: med.name },
        { $inc: { stock: med.qty } }                     // เพิ่มสต็อคกลับ: stock = stock + qty
      )
    }

    // ===== ลบใบสั่งยาออกจากระบบ =====
    await db.collection('prescriptions').deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ message: 'ยกเลิกใบสั่งยาสำเร็จ คืนสต็อคเรียบร้อย' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 📊 DASHBOARD ROUTES — สถิติและรายงาน (Admin)
// =============================================

// ✅ GET /dashboard/top-medicines — ยาขายดี Top 5 (เฉพาะ Admin)
app.get('/dashboard/top-medicines', requireAdmin, async (req, res) => {
  try {
    const result = await db.collection('prescriptions').aggregate([
      { $unwind: '$medicines' },                         // $unwind: แยก array medicines ออกเป็นเอกสารย่อยๆ
      {
        // $group: จัดกลุ่มตามชื่อยา และรวมจำนวนที่ขาย
        $group: {
          _id: '$medicines.name',                        // grouped by ยาแต่ละตัว
          total_qty: { $sum: '$medicines.qty' }          // รวม qty ทั้งหมดของยานั้น
        }
      },
      { $sort: { total_qty: -1 } },                     // เรียงจากมากไปน้อย
      { $limit: 5 }                                      // เอาแค่ 5 อันดับแรก
    ]).toArray()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /dashboard/monthly-revenue — รายได้รายเดือน (เฉพาะ Admin)
app.get('/dashboard/monthly-revenue', requireAdmin, async (req, res) => {
  try {
    const result = await db.collection('prescriptions').aggregate([
      {
        $group: {
          // _id: ตัดเฉพาะปี-เดือน จาก issued_date (เช่น "2024-01")
          _id: { $substr: ['$issued_date', 0, 7] },
          total_revenue: { $sum: '$total_price' },       // รวมรายได้ทั้งหมดในเดือนนั้น
          total_prescriptions: { $sum: 1 }               // นับจำนวนใบสั่งยาในเดือนนั้น
        }
      },
      { $sort: { _id: -1 } }                            // เรียงจากเดือนใหม่ไปเก่า
    ]).toArray()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /dashboard/stock-summary — สรุปสต็อคยาแต่ละหมวดหมู่ (เฉพาะ Admin)
app.get('/dashboard/stock-summary', requireAdmin, async (req, res) => {
  try {
    const result = await db.collection('medicines').aggregate([
      {
        $group: {
          _id: '$category',                              // grouped by หมวดหมู่ยา
          total_stock: { $sum: '$stock' },               // รวมสต็อคทั้งหมดในหมวดนั้น
          avg_price: { $avg: '$price' },                 // ค่าเฉลี่ยราคา
          max_price: { $max: '$price' },                 // ราคาสูงสุด
          min_price: { $min: '$price' },                 // ราคาต่ำสุด
          count: { $sum: 1 }                             // นับจำนวนยาในหมวดนั้น
        }
      },
      { $sort: { total_stock: -1 } }                    // เรียงตามสต็อคจากมากไปน้อย
    ]).toArray()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /dashboard/expiring-soon — ยาใกล้หมดอายุใน 90 วัน (เฉพาะ Admin)
app.get('/dashboard/expiring-soon', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]                    // วันที่วันนี้ (YYYY-MM-DD)
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // วันที่ในอีก 90 วันข้างหน้า

    // ค้นหายาที่ expire_date อยู่ระหว่างวันนี้ ถึง 90 วันข้างหน้า
    const medicines = await db.collection('medicines')
      .find({ expire_date: { $gte: today, $lte: in90Days } })  // $gte = >=, $lte = <=
      .toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ GET /dashboard/low-stock — ยาสต็อคน้อยกว่า 50 (เฉพาะ Admin)
app.get('/dashboard/low-stock', requireAdmin, async (req, res) => {
  try {
    const medicines = await db.collection('medicines')
      .find({ stock: { $lt: 50 } })                     // $lt = less than (< 50)
      .toArray()
    res.json(medicines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 🌍 GEOSPATIAL ROUTES — หาคลินิกใกล้บ้าน (Lab6)
// =============================================

// ✅ GET /clinics/nearby — หาคลินิกใกล้จากพิกัดที่ระบุ (Admin + Doctor)
app.get('/clinics/nearby', requireAny, async (req, res) => {
  try {
    const { lng, lat, distance = 5000 } = req.query     // lng=ลองจิจูด, lat=ละติจูด, distance=รัศมีเมตร (default 5000m)

    // ค้นหาคลินิกโดยใช้ $near (ต้องมี geospatial index ที่ฟิลด์ location ก่อน)
    const clinics = await db.collection('clinics').find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },  // พิกัดจุดอ้างอิง
          $maxDistance: parseInt(distance)              // รัศมีค้นหาสูงสุด (เมตร)
        }
      }
    }).toArray()
    res.json(clinics)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================
// 🚀 START SERVER
// =============================================
connectDB().then(() => {    // รอให้เชื่อมต่อฐานข้อมูลสำเร็จก่อนเริ่ม server
  const PORT = process.env.PORT || 3030  // ใช้ port จาก .env หรือค่าเริ่มต้น 3030
  
  app.listen(PORT, () => {   // เริ่มฟัง request ที่พอร์ตที่กำหนด
    console.log(`🚀 Server running at http://localhost:${PORT}`)
    
    // แสดงรายการ endpoints หลักเพื่ออ้างอิง
    console.log(`📋 Endpoints:`)
    console.log(`   POST   /auth/login`)
    console.log(`   GET    /medicines`)
    console.log(`   GET    /patients`)
    console.log(`   GET    /appointments`)
    console.log(`   POST   /prescriptions`)
    console.log(`   GET    /dashboard/top-medicines`)
    console.log(`   GET    /clinics/nearby?lng=101.25&lat=12.68`)
  })
})