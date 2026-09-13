# Apps + Workshop Live

หน้ารวมแอปแบบคลีน รองรับมือถือ และเกมตอบคำถามสดสำหรับห้องอบรม

## หน้าเว็บ

- `/` — รวมแอปและกิจกรรม พร้อมค้นหาและกรองหมวดหมู่
- `/games/live/` — ทางเข้าสำหรับผู้เล่นและผู้สอน
- `/games/live/admin.html` — จัดการห้อง คำถาม กลุ่ม เวลา และคะแนน
- `/games/live/display.html?room=ABC123` — จอฉายคำถาม QR และอันดับสด
- `/games/live/play.html?room=ABC123` — หน้ามือถือสำหรับตอบคำถาม

ดู [คู่มือติดตั้ง Firebase / Vercel และวิธีใช้](SETUP.md)

## ทดลองในเครื่อง

```sh
npm install
npm run build
DEMO_MODE=true npm run dev
```

เปิด http://127.0.0.1:4174/ รหัสผู้สอนในโหมดทดลองคือ `workshop-demo` ข้อมูลบันทึกใน `.local/` และไม่ส่งขึ้น GitHub

## เพิ่มแอปบนหน้าแรก

แก้ `activities.js` เพิ่มข้อมูลใน `window.ACTIVITIES`:

```js
{
  title: "ชื่อแอป",
  description: "คำอธิบายที่ใช้ค้นหา",
  category: "เครื่องมือ",
  image: "assets/my-app.webp",
  imageAlt: "คำอธิบายภาพ",
  url: "https://your-app.example.com",
  coverLabel: "MY APP",
  coverNote: "คำบรรยายบนปก",
  theme: "blue"
}
```

- คั่นแต่ละรายการด้วย comma; `category` สร้างหมวดหมู่ให้อัตโนมัติ
- รูปแสดงตามสัดส่วนจริงในบอร์ด 1–6 คอลัมน์ รองรับไฟล์ใน assets และ HTTPS URL
- ไม่มีรูปจะแสดงปกตัวอักษรแทน มีธีม lime / blue / peach
- ไม่มี URL จะแสดง “เร็ว ๆ นี้”; มี URL คลิกการ์ดเข้าสู่แอปได้
- การเพิ่มรายการทำผ่านไฟล์แล้ว commit/push ไม่ใช่หน้าจัดการออนไลน์

## ตรวจสอบและ Deploy

```sh
npm test
npm run build
```

Vercel ใช้ `dist` เป็น Output Directory และ `/api/game` เป็น Node.js Function ตาม `vercel.json` ต้องตั้ง Firebase credentials และรหัสผู้สอนก่อนใช้เกมจริง รายละเอียดอยู่ใน SETUP.md
