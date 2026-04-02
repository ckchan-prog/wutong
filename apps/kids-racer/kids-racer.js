const $ = (sel) => document.querySelector(sel);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function safeId(s) {
  return String(s || "").replace(/[^a-z0-9_-]/gi, "");
}

function supportsSpeech() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speakText(text) {
  if (!supportsSpeech()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-HK";
    u.rate = 0.9;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

function setImgOrFallback(imgEl, fallbackEl, url, alt) {
  if (!imgEl || !fallbackEl) return;
  if (!url) {
    imgEl.style.display = "none";
    imgEl.removeAttribute("src");
    fallbackEl.style.display = "block";
    return;
  }
  imgEl.alt = alt || "";
  imgEl.src = url;
  imgEl.style.display = "block";
  fallbackEl.style.display = "none";
  imgEl.addEventListener(
    "error",
    () => {
      imgEl.style.display = "none";
      imgEl.removeAttribute("src");
      fallbackEl.style.display = "block";
    },
    { once: true }
  );
}

function buildTrackPoints(w, h) {
  const pad = Math.min(w, h) * 0.10;
  const cx = w / 2;
  const cy = h / 2;
  const rx = (w - pad * 2) * 0.40;
  const ry = (h - pad * 2) * 0.32;

  // 一條圓角橢圓路線（用多點近似），小朋友看起來像跑圈
  const pts = [];
  const n = 140;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    // 加少少起伏，避免太像幾何圖
    const wobble = 1 + 0.05 * Math.sin(t * 3);
    pts.push({
      x: cx + Math.cos(t) * rx * wobble,
      y: cy + Math.sin(t) * ry * wobble,
    });
  }
  return pts;
}

function resamplePolyline(pts, stepPx) {
  if (pts.length < 2) return pts.slice();

  const out = [pts[0]];
  let carry = 0;

  for (let i = 1; i < pts.length + 1; i++) {
    const a = pts[(i - 1) % pts.length];
    const b = pts[i % pts.length];
    const segLen = dist(a, b);
    if (segLen <= 0.0001) continue;

    let d = carry;
    while (d + stepPx <= segLen) {
      d += stepPx;
      const t = d / segLen;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
    carry = d - segLen;
  }
  return out;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function parseCars(json) {
  if (!Array.isArray(json)) return [];
  return json
    .map((c) => ({
      id: safeId(c?.id),
      name: String(c?.name || "車"),
      color: String(c?.color || "#ffffff"),
      icon: String(c?.icon || ""),
      sentences: Array.isArray(c?.sentences)
        ? c.sentences.map((s) => String(s))
        : [],
      keywords: Array.isArray(c?.keywords) ? c.keywords.map((k) => String(k)) : [],
    }))
    .filter((c) => c.id && c.name);
}

async function loadCars() {
  const res = await fetch("./cars.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return parseCars(json);
}

function createCarButtons(cars, onSpawn, onSelect) {
  const host = $("#carButtons");
  if (!host) return;
  host.innerHTML = "";

  for (const car of cars) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "carBtn";
    btn.setAttribute("data-car-id", car.id);

    const icon = document.createElement("div");
    icon.className = "carIcon";

    const img = document.createElement("img");
    const fallback = document.createElement("div");
    fallback.className = "carIconFallback";
    setImgOrFallback(img, fallback, car.icon, `${car.name} 圖標`);
    icon.appendChild(img);
    icon.appendChild(fallback);

    const text = document.createElement("div");
    text.className = "carText";

    const name = document.createElement("p");
    name.className = "carName";
    name.textContent = car.name;

    const hint = document.createElement("p");
    hint.className = "carHint";
    hint.textContent = car.sentences?.[0] || "按一下放車";

    text.appendChild(name);
    text.appendChild(hint);

    btn.appendChild(icon);
    btn.appendChild(text);

    btn.addEventListener("click", () => {
      onSelect(car);
      onSpawn(car);
    });

    host.appendChild(btn);
  }
}

function renderWordCard(car, opts) {
  const title = $("#cardTitle");
  const sub = $("#cardSub");
  const sentences = $("#sentences");
  const keywords = $("#keywords");
  const chip = $("#cardChip");

  const img = $("#cardIconImg");
  const fallback = $("#cardIconFallback");
  if (img && fallback) setImgOrFallback(img, fallback, car?.icon, `${car?.name || ""} 圖標`);

  if (title) title.textContent = car?.name || "選一架車";
  if (sub) sub.textContent = car ? "按句子可朗讀。" : "按下面任何一個按鈕，放一架車出來。";

  if (chip) chip.hidden = !car?.keywords?.length;

  if (sentences) {
    sentences.innerHTML = "";
    const list = car?.sentences?.length ? car.sentences : [];
    for (const s of list) {
      const wrap = document.createElement("div");
      wrap.className = "sentence";

      const b = document.createElement("button");
      b.type = "button";
      b.className = "sentenceBtn";
      b.textContent = s;
      b.disabled = !opts.speechEnabled;
      b.addEventListener("click", () => speakText(s));

      wrap.appendChild(b);
      sentences.appendChild(wrap);
    }
  }

  if (keywords) {
    keywords.innerHTML = "";
    const list = car?.keywords?.length ? car.keywords : [];
    for (const k of list) {
      const el = document.createElement("span");
      el.className = "kw";
      el.textContent = k;
      el.role = "button";
      el.tabIndex = 0;
      el.addEventListener("click", () => {
        if (opts.speechEnabled) speakText(k);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (opts.speechEnabled) speakText(k);
        }
      });
      keywords.appendChild(el);
    }
  }
}

function game() {
  const canvas = $("#game");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const countBadge = $("#countBadge");
  const tipBadge = $("#tipBadge");

  const speedDown = $("#speedDown");
  const speedUp = $("#speedUp");
  const reset = $("#reset");

  const toggleSpeech = $("#toggleSpeech");
  const opts = {
    speed: 120,
    speechEnabled: false,
  };

  const KEY_SPEECH = "kidsRacer:speech";
  const savedSpeech = localStorage.getItem(KEY_SPEECH);
  opts.speechEnabled = savedSpeech === "on" && supportsSpeech();
  if (toggleSpeech) {
    toggleSpeech.disabled = !supportsSpeech();
    toggleSpeech.setAttribute("aria-pressed", opts.speechEnabled ? "true" : "false");
    toggleSpeech.textContent = `朗讀：${opts.speechEnabled ? "開" : "關"}`;
    toggleSpeech.addEventListener("click", () => {
      opts.speechEnabled = !opts.speechEnabled;
      localStorage.setItem(KEY_SPEECH, opts.speechEnabled ? "on" : "off");
      toggleSpeech.setAttribute("aria-pressed", opts.speechEnabled ? "true" : "false");
      toggleSpeech.textContent = `朗讀：${opts.speechEnabled ? "開" : "關"}`;
      // 重新渲染字卡，更新按鈕 disabled 狀態
      if (state.selectedCar) renderWordCard(state.selectedCar, opts);
    });
  }

  if (speedDown) {
    speedDown.addEventListener("click", () => {
      opts.speed = clamp(opts.speed - 20, 60, 220);
      if (tipBadge) tipBadge.textContent = `速度：${opts.speed}`;
    });
  }
  if (speedUp) {
    speedUp.addEventListener("click", () => {
      opts.speed = clamp(opts.speed + 20, 60, 220);
      if (tipBadge) tipBadge.textContent = `速度：${opts.speed}`;
    });
  }

  const state = {
    carsCatalog: [],
    carsLive: [],
    selectedCar: null,
    trackBase: [],
    track: [],
    lastTs: performance.now(),
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    spawnLane: 0,
  };

  function setCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    state.trackBase = buildTrackPoints(w, h);
    state.track = resamplePolyline(state.trackBase, 10);
  }

  function spawnCar(carDef) {
    if (!state.track.length) return;
    const lane = state.spawnLane++ % 4;
    const offset = lane * 6;
    const radius = 10;

    state.carsLive.push({
      id: `${carDef.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      def: carDef,
      t: offset, // 以點索引代表位置
      radius,
    });

    if (countBadge) countBadge.textContent = `${state.carsLive.length} 架車`;
    if (tipBadge) tipBadge.textContent = "已放車！";

    if (opts.speechEnabled && carDef?.sentences?.[0]) speakText(carDef.sentences[0]);
  }

  function clearCars() {
    state.carsLive = [];
    if (countBadge) countBadge.textContent = "0 架車";
    if (tipBadge) tipBadge.textContent = "提示：按下面按鈕放車";
  }

  if (reset) reset.addEventListener("click", clearCars);

  function drawTrack(w, h) {
    // 外框
    ctx.save();
    ctx.globalAlpha = 1;
    drawRoundedRect(ctx, 8, 8, w - 16, h - 16, 18);
    ctx.strokeStyle = "rgba(255, 239, 186, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 賽道（厚線 + 內線）
    if (!state.trackBase.length) return;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    for (let i = 0; i < state.trackBase.length; i++) {
      const p = state.trackBase[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();

    ctx.strokeStyle = "rgba(255, 249, 230, 0.10)";
    ctx.lineWidth = 44;
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.lineWidth = 36;
    ctx.stroke();

    ctx.strokeStyle = "rgba(241, 210, 122, 0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 起點線
    if (state.track.length >= 4) {
      const p0 = state.track[0];
      const p1 = state.track[3];
      ctx.save();
      ctx.strokeStyle = "rgba(241, 210, 122, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCars() {
    if (!state.track.length) return;
    for (const car of state.carsLive) {
      const idx = Math.floor(car.t) % state.track.length;
      const p = state.track[idx];
      const pNext = state.track[(idx + 1) % state.track.length];
      const ang = Math.atan2(pNext.y - p.y, pNext.x - p.x);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      // 車身
      ctx.fillStyle = car.def.color;
      ctx.globalAlpha = 0.95;
      drawRoundedRect(ctx, -16, -10, 32, 20, 8);
      ctx.fill();

      // 車窗
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      drawRoundedRect(ctx, -6, -7, 14, 10, 5);
      ctx.fill();

      // 車頭光
      ctx.fillStyle = "rgba(255, 249, 230, 0.65)";
      drawRoundedRect(ctx, 12, -6, 5, 4, 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function loop(ts) {
    const dt = Math.min(0.033, Math.max(0.001, (ts - state.lastTs) / 1000));
    state.lastTs = ts;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    drawTrack(w, h);

    // 更新位置：速度換成每秒走幾個點
    const pointsPerSec = (opts.speed / 120) * 24;
    for (const car of state.carsLive) {
      car.t = (car.t + pointsPerSec * dt) % state.track.length;
    }

    drawCars();
    requestAnimationFrame(loop);
  }

  function attachResize() {
    const ro = new ResizeObserver(() => {
      setCanvasSize();
    });
    ro.observe(canvas);
    window.addEventListener("orientationchange", () => setTimeout(setCanvasSize, 50));
  }

  (async () => {
    setCanvasSize();
    attachResize();

    try {
      state.carsCatalog = await loadCars();
    } catch {
      state.carsCatalog = [];
    }

    const onSelect = (carDef) => {
      state.selectedCar = carDef;
      renderWordCard(carDef, opts);
    };

    createCarButtons(
      state.carsCatalog,
      (carDef) => spawnCar(carDef),
      (carDef) => onSelect(carDef)
    );

    // 預設顯示第一架車的字卡（如果有）
    if (state.carsCatalog[0]) onSelect(state.carsCatalog[0]);
    else renderWordCard(null, opts);

    if (countBadge) countBadge.textContent = "0 架車";
    requestAnimationFrame(loop);
  })();
}

game();

