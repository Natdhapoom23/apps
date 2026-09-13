(() => {
  "use strict";
  const grid = document.getElementById("activity-grid");
  const items = Array.isArray(window.ACTIVITIES) ? window.ACTIVITIES : [];
  const safeUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, location.href);
      return ["https:", "http:"].includes(url.protocol) ||
        (location.protocol === "file:" && url.protocol === "file:") ? url.href : "";
    } catch { return ""; }
  };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  document.getElementById("activity-count").textContent = `${items.length} กิจกรรม`;
  items.forEach((item, index) => {
    const url = safeUrl(item.url);
    const card = el("article", "activity-card");
    const cover = el("div", `cover ${["lime", "blue", "peach"].includes(item.theme) ? item.theme : "blue"}`);
    const coverTop = el("div", "cover-top");
    coverTop.append(el("span", "", "AI PLAYGROUND"), el("span", "", String(index + 1).padStart(2, "0")));
    cover.append(coverTop, el("div", "cover-title", item.coverLabel || item.title), el("span", "cover-note", item.coverNote || "ลองเล่น แล้วเรียนรู้"));
    const imageUrl = safeUrl(item.image);
    if (imageUrl) {
      const image = el("img", "cover-image");
      image.src = imageUrl;
      image.alt = item.imageAlt || "";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove());
      cover.append(image);
    }
    const content = el("div", "card-content");
    const meta = el("div", "card-meta");
    meta.append(el("span", "category", item.category || "กิจกรรม"), el("span", `status ${url ? "ready" : ""}`, url ? "พร้อมเล่น" : "เร็ว ๆ นี้"));
    const title = el("h3", "", item.title || "กิจกรรมใหม่");
    content.append(meta, title, el("p", "description", item.description || ""), el("p", "format", item.format || "เรียนรู้ด้วยตัวเอง"));
    if (url) {
      const link = el("a", "activity-link", "เข้าสู่กิจกรรม");
      link.href = url;
      link.setAttribute("aria-label", `เข้าสู่กิจกรรม ${item.title}`);
      const arrow = el("span", "", "↗");
      arrow.setAttribute("aria-hidden", "true");
      link.append(arrow);
      content.append(link);
    } else {
      content.append(el("div", "activity-pending", "กำลังเตรียมกิจกรรม"));
    }
    card.append(cover, content);
    grid.append(card);
  });
  const next = el("div", "next-card");
  next.append(el("span", "next-symbol", "+"), el("h3", "", "พื้นที่สำหรับไอเดียถัดไป"), el("p", "", "เกมใหม่ ความท้าทายใหม่\nแล้วกลับมาลองด้วยกัน"), el("span", "next-label", "MORE TO EXPLORE"));
  grid.append(next);
})();
