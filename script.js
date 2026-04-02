const $ = (sel) => document.querySelector(sel);

function setYear() {
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function normalizeApp(app) {
  return {
    id: String(app?.id ?? ""),
    name: String(app?.name ?? "Untitled"),
    description: String(app?.description ?? ""),
    href: String(app?.href ?? "#"),
    tag: String(app?.tag ?? ""),
    icon: String(app?.icon ?? ""),
  };
}

function setIcon(iconRoot, iconUrl, appName) {
  const img = iconRoot.querySelector(".icon-img");
  const fallback = iconRoot.querySelector(".icon-fallback");
  if (!img || !fallback) return;

  if (!iconUrl) {
    img.style.display = "none";
    img.removeAttribute("src");
    fallback.style.display = "block";
    return;
  }

  img.alt = `${appName} 圖標`;
  img.src = iconUrl;
  img.style.display = "block";
  fallback.style.display = "none";

  img.addEventListener(
    "error",
    () => {
      img.style.display = "none";
      img.removeAttribute("src");
      fallback.style.display = "block";
    },
    { once: true }
  );
}

function renderApps(apps) {
  const grid = $("#appsGrid");
  const tpl = $("#appCardTpl");
  const badge = $("#appCount");
  if (!grid || !tpl) return;

  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = "";

  const frag = document.createDocumentFragment();

  for (const raw of apps) {
    const app = normalizeApp(raw);
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".card");
    const a = node.querySelector(".card-link");
    const title = node.querySelector(".card-title");
    const desc = node.querySelector(".card-desc");
    const tag = node.querySelector(".card-tag");
    const icon = node.querySelector(".icon");

    if (card) card.dataset.appId = app.id;
    if (a) {
      a.href = app.href || "#";
      a.target = /^https?:\/\//i.test(app.href) ? "_blank" : "_self";
      a.rel = a.target === "_blank" ? "noreferrer" : "";
    }
    if (title) title.textContent = app.name;
    if (desc) desc.textContent = app.description;
    if (tag) {
      if (app.tag) {
        tag.textContent = app.tag;
        tag.style.display = "inline-flex";
      } else {
        tag.style.display = "none";
      }
    }
    if (icon) setIcon(icon, app.icon, app.name);

    frag.appendChild(node);
  }

  grid.appendChild(frag);
  grid.setAttribute("aria-busy", "false");

  if (badge) badge.textContent = `${apps.length} 個`;
}

async function loadApps() {
  try {
    const res = await fetch("./apps.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function initViewToggle() {
  const btn = $("#toggleView");
  const root = document.body;
  if (!btn) return;

  const KEY = "wutong:view";

  const apply = (mode) => {
    if (mode === "icons") {
      root.classList.add("view-icons");
      btn.textContent = "切換：列表";
    } else {
      root.classList.remove("view-icons");
      btn.textContent = "切換：圖標";
    }
  };

  const saved = localStorage.getItem(KEY);
  apply(saved === "icons" ? "icons" : "list");

  btn.addEventListener("click", () => {
    const isIcons = root.classList.toggle("view-icons");
    localStorage.setItem(KEY, isIcons ? "icons" : "list");
    btn.textContent = isIcons ? "切換：列表" : "切換：圖標";
  });
}

async function main() {
  setYear();
  initViewToggle();
  const apps = await loadApps();
  renderApps(apps);
}

main();

