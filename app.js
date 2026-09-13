(() => {
  "use strict";
  const grid = document.getElementById("activity-grid");
  const search = document.getElementById("search");
  const items = (Array.isArray(window.ACTIVITIES) ? window.ACTIVITIES : []).filter(item => item && typeof item === "object");
  let selected = "";
  const safeUrl = value => {
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
  const categories = document.getElementById("categories");
  ["", ...new Set(items.map(item => item.category || "อื่น ๆ"))].forEach(category => {
    const button = el("button", "category-button", category || "ทั้งหมด");
    button.type = "button";
    button.dataset.category = category;
    button.setAttribute("aria-pressed", String(category === selected));
    button.addEventListener("click", () => { selected = category; render(); });
    categories.append(button);
  });
  function render() {
    grid.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase("th");
    const filtered = items.filter(item => (!selected || (item.category || "อื่น ๆ") === selected) &&
      [item.title, item.description, item.category].join(" ").toLocaleLowerCase("th").includes(query));
    document.getElementById("activity-count").textContent = `${filtered.length} รายการ`;
    document.getElementById("empty").hidden = filtered.length > 0;
    for (const button of categories.children) button.setAttribute("aria-pressed", String(button.dataset.category === selected));
    filtered.forEach(item => {
      const url = safeUrl(item.url);
      const card = el("article", "activity-card");
      const wrapper = el(url ? "a" : "div", "card-link");
      if (url) { wrapper.href = url; wrapper.setAttribute("aria-label", `เปิด ${item.title}`); }
      const cover = el("div", `cover ${["lime", "blue", "peach"].includes(item.theme) ? item.theme : "blue"}`);
      const top = el("div", "cover-top");
      top.append(el("span", "", item.category || "APPS"), el("span", "", "+"));
      cover.append(top, el("div", "cover-title", item.coverLabel || item.title), el("span", "cover-note", item.coverNote || ""));
      const imageUrl = safeUrl(item.image);
      if (imageUrl) {
        const image = el("img", "cover-image");
        image.alt = item.imageAlt || "";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => { image.remove(); cover.classList.remove("has-image"); });
        cover.classList.add("has-image");
        image.src = imageUrl;
        cover.append(image);
      }
      if (url) {
        const arrow = el("span", "open-icon", "↗");
        arrow.setAttribute("aria-hidden", "true");
        cover.append(arrow);
      }
      const meta = el("div", "card-meta");
      const titleGroup = el("div", "");
      titleGroup.append(el("h2", "", item.title || "แอปใหม่"), el("p", "card-category", item.category || "อื่น ๆ"));
      meta.append(titleGroup);
      if (!url) meta.append(el("span", "pending", "เร็ว ๆ นี้"));
      wrapper.append(cover, meta);
      card.append(wrapper);
      grid.append(card);
    });
  }
  search.addEventListener("input", render);
  document.getElementById("reset").addEventListener("click", () => {
    selected = ""; search.value = ""; render(); search.focus();
  });
  render();
})();
