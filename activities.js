// เพิ่มแอป เครื่องมือ เกม หรือกิจกรรม โดยคัดลอกข้อมูลหนึ่งชุดในรายการนี้
// image: รูปในโฟลเดอร์ assets เช่น "assets/my-game.webp" หรือ URL แบบ https://
// url: ลิงก์ไปกิจกรรม เช่น "https://example.com/game" หรือ "./games/my-game/"
// เมื่อมี url จะคลิกการ์ดเพื่อเปิดระบบได้; url ว่าง = เร็ว ๆ นี้
// category: ชื่อหมวดหมู่ แถบกรองจะเพิ่มหมวดหมู่ใหม่ให้อัตโนมัติ
window.ACTIVITIES = [
  {
    title: "AI จริงหรือหลอก?",
    description: "ชวนจับสังเกตภาพ ท้าทายความเชื่อ แล้วค้นหาคำตอบไปพร้อมกันทั้งห้อง",
    category: "เกมตอบคำถาม",
    format: "เล่นพร้อมกันในห้องอบรม",
    image: "",
    imageAlt: "",
    url: "./games/live/",
    coverLabel: "HUMAN\nOR AI?",
    coverNote: "มองให้ดี แล้วลองทาย",
    theme: "lime"
  },
  {
    title: "เปิดแผ่นป้าย",
    description: "เลือกหมายเลข เปิดข้อความหรือรูปภาพทีละแผ่น พร้อมดูผลพร้อมกันทั้งห้อง",
    category: "เกมกิจกรรม",
    format: "ผู้บรรยายสร้างห้องและเตรียมแผ่นป้าย",
    image: "",
    imageAlt: "",
    url: "./games/board/",
    coverLabel: "OPEN\nTHE BOARD",
    coverNote: "เลือกเลข แล้วเปิดดู",
    theme: "blue"
  }
];
