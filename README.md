# AI Playground

หน้าแรกภาษาไทยสำหรับรวมเกมและกิจกรรมการเรียนรู้ AI ใช้ HTML, CSS และ JavaScript ธรรมดา ไม่ต้องติดตั้ง dependencies หรือ build และยังไม่เชื่อม Firebase

## เพิ่มกิจกรรม

แก้ไฟล์ `activities.js` โดยเพิ่มข้อมูลใน `window.ACTIVITIES`:

```js
{
  title: "ชื่อกิจกรรม",
  description: "คำอธิบายกิจกรรมสั้น ๆ",
  category: "เกมตอบคำถาม",
  format: "เล่นพร้อมกันในห้องอบรม",
  image: "assets/my-activity.webp",
  imageAlt: "คำอธิบายภาพ",
  url: "https://your-activity.example.com",
  coverLabel: "TRY\nSOMETHING NEW",
  coverNote: "ลองเล่น แล้วเรียนรู้",
  theme: "blue"
}
```

- ใส่เครื่องหมายจุลภาคคั่นแต่ละกิจกรรม
- วางรูปใน `assets/` แนะนำสัดส่วนประมาณ 3:2 หรือใส่ URL รูป HTTPS
- หากไม่ใส่รูปหรือโหลดรูปไม่ได้ จะแสดงปกตัวอักษรแทน มีสี `lime`, `blue`, `peach`
- ใส่ `url` เพื่อเปิดปุ่มเข้าสู่กิจกรรม รองรับ URL HTTPS และลิงก์ภายใน เช่น `./games/quiz/`
- หาก `url` ว่าง จะแสดง “เร็ว ๆ นี้” และไม่มีปุ่มลิงก์ที่กดแล้วไปหน้าที่ยังไม่มี
- การเพิ่มกิจกรรมทำผ่านไฟล์ ไม่ใช่หน้าแอดมินออนไลน์ เมื่อ commit และ push แล้ว Vercel จะ deploy ตามการตั้งค่าโปรเจกต์

## ดูตัวอย่าง

เปิด `index.html` ในเบราว์เซอร์ได้ทันที หรือใช้ static web server ที่คุณมีอยู่
ฟอนต์โหลดจาก Google Fonts หากไม่มีอินเทอร์เน็ตจะใช้ฟอนต์สำรองในเครื่อง

## GitHub และ Vercel

1. นำไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น GitHub repository ที่ต้องการ
2. ใน Vercel เลือก Add New Project แล้ว import repository
3. เลือก Framework Preset: Other, Root Directory เป็นราก repository
4. ไม่ต้องตั้ง Build Command; ใช้รากโปรเจกต์เป็น Output Directory (`.`)
5. Deploy แล้วตรวจหน้าแรกและลิงก์กิจกรรม

กิจกรรม “AI จริงหรือหลอก?” เป็นรายการเตรียมเปิด ยังไม่ได้สร้างตัวเกม และจะยังไม่เปิดให้คลิกจนกว่าจะใส่ URL
