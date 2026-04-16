import * as THREE from "three";

const $ = (sel) => document.querySelector(sel);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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

let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

async function resumeAudio() {
  const ctx = getAudio();
  if (ctx?.state === "suspended") await ctx.resume();
}

function playSpawn() {
  const ctx = getAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(520, t0);
  o.frequency.exponentialRampToValueAtTime(880, t0 + 0.08);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.14);
}

function playPullback(intensity) {
  const ctx = getAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(180 + intensity * 120, t0);
  o.frequency.exponentialRampToValueAtTime(90, t0 + 0.28);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.34);
}

function playLaunch(power) {
  const ctx = getAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(800 + power * 1200, t0);
  f.frequency.exponentialRampToValueAtTime(2800 + power * 800, t0 + 0.18);
  o.type = "sawtooth";
  o.frequency.setValueAtTime(90 + power * 40, t0);
  o.frequency.exponentialRampToValueAtTime(220 + power * 180, t0 + 0.22);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.11 + power * 0.08, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
  o.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.38);
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

function variedColor(baseHex) {
  const c = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.h = (hsl.h + (Math.random() - 0.5) * 0.14 + 1) % 1;
  hsl.s = clamp(hsl.s + (Math.random() - 0.5) * 0.2, 0.25, 0.95);
  hsl.l = clamp(hsl.l + (Math.random() - 0.5) * 0.1, 0.28, 0.78);
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${c.getHexString()}`;
}

const TRACK_RX = 9;
const TRACK_RZ = 6;
const LANE_WIDTH = 0.62;
const LANES = 4;

function buildTrackCurve() {
  const n = 200;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.04 * Math.sin(t * 3);
    pts.push(
      new THREE.Vector3(
        Math.cos(t) * TRACK_RX * wobble,
        0,
        Math.sin(t) * TRACK_RZ * wobble
      )
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.1);
  curve.arcLengthDivisions = 800;
  return curve;
}

function buildRibbonMesh(curve, halfWidth, y, material) {
  const N = curve.points?.length || 200;
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u, new THREE.Vector3());
    const t = curve.getTangentAt(u, new THREE.Vector3()).normalize();
    const nx = -t.z;
    const nz = t.x;
    const len = Math.hypot(nx, nz) || 1;
    const lx = (nx / len) * halfWidth;
    const lz = (nz / len) * halfWidth;
    verts.push(p.x - lx, y, p.z - lz);
    verts.push(p.x + lx, y, p.z + lz);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, u, 1, u);
  }

  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = next * 2 + 1;
    const d = next * 2;
    indices.push(a, b, c, a, c, d);
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function matStd(hex, rough = 0.55, metal = 0.12) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: rough,
    metalness: metal,
  });
}

function addWheels(group, w, zFront, zBack, y = 0.22) {
  const tire = matStd("#141414", 0.85, 0.02);
  const g = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16);
  const place = (x, z) => {
    const m = new THREE.Mesh(g, tire);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
  };
  place(w * 0.48, zFront);
  place(-w * 0.48, zFront);
  place(w * 0.48, zBack);
  place(-w * 0.48, zBack);
}

function makeSportsCar(paintHex) {
  const g = new THREE.Group();
  const body = matStd(paintHex, 0.35, 0.35);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1a2530,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
  });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 2.15), body);
  lower.position.set(0, 0.35, 0);
  g.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 1.0), glass);
  cabin.position.set(0, 0.62, -0.15);
  g.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.75), body);
  hood.position.set(0, 0.48, 0.72);
  hood.rotation.x = -0.12;
  g.add(hood);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.18), body);
  spoiler.position.set(0, 0.52, -0.95);
  g.add(spoiler);

  const hl = new THREE.MeshStandardMaterial({
    color: 0xfff6dd,
    emissive: 0xffe8a8,
    emissiveIntensity: 0.55,
  });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.1), hl);
  head.position.set(0, 0.38, 1.05);
  g.add(head);

  addWheels(g, 1.05, 0.65, -0.65);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function makeConstructionCar(paintHex) {
  const g = new THREE.Group();
  const yellow = matStd(paintHex, 0.65, 0.05);
  const dark = matStd("#2a2418", 0.9, 0.02);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x223040,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.35, 2.4), dark);
  chassis.position.set(0, 0.38, 0);
  g.add(chassis);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 0.95), yellow);
  cab.position.set(0, 0.78, 0.55);
  g.add(cab);

  const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.05), glass);
  win.position.set(0, 0.92, 0.98);
  g.add(win);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.32, 1.15), yellow);
  bed.position.set(0, 0.72, -0.55);
  bed.rotation.x = 0.12;
  g.add(bed);

  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.45), dark);
  scoop.position.set(0, 0.52, -1.15);
  scoop.rotation.x = -0.35;
  g.add(scoop);

  addWheels(g, 1.15, 0.75, -0.75, 0.24);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function makeAmbulanceCar(accentHex) {
  const g = new THREE.Group();
  const white = matStd("#f4f6fa", 0.55, 0.05);
  const accent = matStd(accentHex, 0.45, 0.08);
  const red = matStd("#e02020", 0.45, 0.05);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1e3048,
    roughness: 0.25,
    transparent: true,
    opacity: 0.88,
  });

  const van = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.72, 2.35), white);
  van.position.set(0, 0.58, 0);
  g.add(van);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.12, 2.32), accent);
  stripe.position.set(0, 0.58, 0);
  g.add(stripe);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.08), red);
  crossV.position.set(0.42, 0.62, 0.2);
  g.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.08), red);
  crossH.position.set(0.42, 0.62, 0.2);
  g.add(crossH);

  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.06), glass);
  cabWin.position.set(0, 0.72, 1.05);
  g.add(cabWin);

  const bar = new THREE.MeshStandardMaterial({
    color: 0xff3030,
    emissive: 0xff2020,
    emissiveIntensity: 0.6,
  });
  const lights = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.12), bar);
  lights.position.set(0, 0.98, 0.95);
  g.add(lights);

  addWheels(g, 1.12, 0.7, -0.7, 0.24);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function makeFireTruckCar(paintHex) {
  const g = new THREE.Group();
  const red = matStd(paintHex, 0.45, 0.12);
  const silver = matStd("#c8ccd4", 0.4, 0.55);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1a2838,
    roughness: 0.28,
    transparent: true,
    opacity: 0.85,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.68, 2.55), red);
  body.position.set(0, 0.58, -0.1);
  g.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 0.95), red);
  cab.position.set(0, 0.78, 0.95);
  g.add(cab);

  const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.38, 0.06), glass);
  win.position.set(0, 0.88, 1.38);
  g.add(win);

  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.45), silver);
  ladder.position.set(0.35, 0.95, -0.15);
  ladder.rotation.z = -0.08;
  g.add(ladder);

  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), silver);
  hose.rotation.z = Math.PI / 2;
  hose.position.set(-0.45, 0.55, -0.85);
  g.add(hose);

  const bar = new THREE.MeshStandardMaterial({
    color: 0xffcc33,
    emissive: 0xffaa00,
    emissiveIntensity: 0.45,
  });
  const topLights = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.14), bar);
  topLights.position.set(0, 1.02, 1.0);
  g.add(topLights);

  addWheels(g, 1.18, 0.85, -0.85, 0.24);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function makeCarModel(kind, paintHex) {
  switch (kind) {
    case "sports":
      return makeSportsCar(paintHex);
    case "construction":
      return makeConstructionCar(paintHex);
    case "ambulance":
      return makeAmbulanceCar(paintHex);
    case "firetruck":
      return makeFireTruckCar(paintHex);
    default:
      return makeSportsCar(paintHex);
  }
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

    btn.addEventListener("click", async () => {
      await resumeAudio();
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
    toggleSpeech.addEventListener("click", async () => {
      await resumeAudio();
      opts.speechEnabled = !opts.speechEnabled;
      localStorage.setItem(KEY_SPEECH, opts.speechEnabled ? "on" : "off");
      toggleSpeech.setAttribute("aria-pressed", opts.speechEnabled ? "true" : "false");
      toggleSpeech.textContent = `朗讀：${opts.speechEnabled ? "開" : "關"}`;
      if (state.selectedCar) renderWordCard(state.selectedCar, opts);
    });
  }

  if (speedDown) {
    speedDown.addEventListener("click", async () => {
      await resumeAudio();
      opts.speed = clamp(opts.speed - 20, 60, 220);
      if (tipBadge) tipBadge.textContent = `速度：${opts.speed}`;
    });
  }
  if (speedUp) {
    speedUp.addEventListener("click", async () => {
      await resumeAudio();
      opts.speed = clamp(opts.speed + 20, 60, 220);
      if (tipBadge) tipBadge.textContent = `速度：${opts.speed}`;
    });
  }

  const state = {
    carsCatalog: [],
    carsLive: [],
    selectedCar: null,
    lastTs: performance.now(),
    spawnIdx: 0,
    dragging: null,
  };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const bg = new THREE.Color("#0f0d08");
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 22, 70);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 17, 15);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x1a140c, 0.85);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xfff0d0, 1.15);
  dir.position.set(12, 22, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 2;
  dir.shadow.camera.far = 80;
  dir.shadow.camera.left = -28;
  dir.shadow.camera.right = 28;
  dir.shadow.camera.top = 28;
  dir.shadow.camera.bottom = -28;
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 90),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color("#141a12"),
      roughness: 1,
      metalness: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const trackCurve = buildTrackCurve();
  const trackLen = trackCurve.getLength();

  const roadMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1e1e22"),
    roughness: 0.92,
    metalness: 0.04,
  });
  const roadHalf = LANE_WIDTH * (LANES / 2) + 0.35;
  const road = buildRibbonMesh(trackCurve, roadHalf, 0.02, roadMat);
  road.receiveShadow = true;
  scene.add(road);

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35);
  const dragHit = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _n = new THREE.Vector3();

  function getLaneOffset(laneIdx) {
    const centered = laneIdx - (LANES - 1) / 2;
    return centered * LANE_WIDTH;
  }

  function curveFrame(u, laneOffset) {
    const uu = (u % 1 + 1) % 1;
    trackCurve.getPointAt(uu, _p);
    trackCurve.getTangentAt(uu, _t).normalize();
    _n.set(-_t.z, 0, _t.x).normalize();
    const pos = _p.clone().add(_n.clone().multiplyScalar(laneOffset));
    const yaw = Math.atan2(_t.x, _t.z);
    return { pos, yaw, tangent: _t.clone(), normal: _n.clone() };
  }

  function setCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(64, rect.width);
    const h = Math.max(64, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function spawnCar(carDef) {
    const lane = state.spawnIdx++ % LANES;
    const paintHex = variedColor(carDef.color);
    const model = makeCarModel(carDef.id, paintHex);
    const liveId = `${carDef.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    model.userData.liveId = liveId;
    scene.add(model);

    const uBase = (state.spawnIdx * 0.073) % 1;
    const uPull = 0.012 + Math.random() * 0.028;
    const power = clamp(uPull / 0.04, 0, 1);

    state.carsLive.push({
      id: liveId,
      def: carDef,
      mesh: model,
      lane,
      u: uBase,
      phase: "pullback",
      pullT: 0,
      pullDur: 0.42 + Math.random() * 0.12,
      uPull,
      power,
      grabPull: 0,
      boost: 1,
      mode: "auto",
    });

    if (countBadge) countBadge.textContent = `${state.carsLive.length} 架車`;
    if (tipBadge) tipBadge.textContent = "拉後衝前！亦可拖住架車再拉一次～";

    playSpawn();
    playPullback(power);

    if (opts.speechEnabled && carDef?.sentences?.[0]) speakText(carDef.sentences[0]);
  }

  function clearCars() {
    for (const car of state.carsLive) {
      if (car.mesh) scene.remove(car.mesh);
    }
    state.carsLive = [];
    state.spawnIdx = 0;
    if (countBadge) countBadge.textContent = "0 架車";
    if (tipBadge) tipBadge.textContent = "提示：按下面按鈕放車";
  }

  if (reset) {
    reset.addEventListener("click", async () => {
      await resumeAudio();
      clearCars();
    });
  }

  function updateCars(dt) {
    const baseMetersPerSec = (opts.speed / 120) * 7.2;
    const baseU = baseMetersPerSec / Math.max(0.001, trackLen);

    for (const car of state.carsLive) {
      if (!car.mesh) continue;

      if (car.phase === "pullback") {
        car.pullT += dt;
        const k = clamp(car.pullT / car.pullDur, 0, 1);
        const ease = 1 - (1 - k) * (1 - k);
        car.grabPull = car.uPull * ease;
        if (car.pullT >= car.pullDur) {
          car.phase = "launch";
          car.grabPull = 0;
          playLaunch(car.power);
          car.boost = 1 + car.power * 2.4;
        }
      } else if (car.phase === "launch") {
        car.u = (car.u + baseU * car.boost * dt) % 1;
        car.boost = 1 + (car.boost - 1) * Math.exp(-dt * 2.2);
        if (car.boost < 1.02) {
          car.boost = 1;
          car.phase = "cruise";
        }
      } else if (car.phase === "cruise") {
        if (car.mode !== "grabbed") {
          car.u = (car.u + baseU * dt) % 1;
        }
      }

      const laneOff = getLaneOffset(car.lane);
      let uVis = car.u;
      if (car.phase === "pullback") {
        uVis = (car.u - car.grabPull + 1) % 1;
      } else if (car.mode === "grabbed") {
        uVis = (car.u - car.grabPull / Math.max(0.001, trackLen) + 1) % 1;
      }

      const frame = curveFrame(uVis, laneOff);
      car.mesh.position.copy(frame.pos);
      car.mesh.rotation.set(0, frame.yaw, 0);
    }
  }

  function setPointerFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointerNdc.set(x * 2 - 1, -(y * 2 - 1));
  }

  function hitTestCar() {
    raycaster.setFromCamera(pointerNdc, camera);
    const roots = state.carsLive.map((c) => c.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData?.liveId) o = o.parent;
    const id = o?.userData?.liveId;
    if (!id) return null;
    return state.carsLive.find((c) => c.id === id) || null;
  }

  function attachDragControls() {
    canvas.style.touchAction = "none";

    const onDown = async (e) => {
      await resumeAudio();
      setPointerFromEvent(e);
      const car = hitTestCar();
      if (!car || car.phase !== "cruise") return;
      e.preventDefault();
      car.mode = "grabbed";
      car.grabPull = 0;
      const laneOff = getLaneOffset(car.lane);
      const fr = curveFrame(car.u, laneOff);
      state.dragging = { car, tangent: fr.tangent };
      if (tipBadge) tipBadge.textContent = "向後拉，放手再衝！";
    };

    const onMove = (e) => {
      if (!state.dragging) return;
      setPointerFromEvent(e);
      raycaster.setFromCamera(pointerNdc, camera);
      if (!raycaster.ray.intersectPlane(dragPlane, dragHit)) return;
      const { car, tangent } = state.dragging;
      const laneOff = getLaneOffset(car.lane);
      const fr = curveFrame(car.u, laneOff);
      const backward = tangent.clone().multiplyScalar(-1);
      const pull = clamp(dragHit.clone().sub(fr.pos).dot(backward), 0, 3.8);
      car.grabPull = pull;
    };

    const onUp = () => {
      if (!state.dragging) return;
      const car = state.dragging.car;
      state.dragging = null;
      const p = car.grabPull;
      car.grabPull = 0;
      car.mode = "auto";
      if (p > 0.15) {
        const power = clamp(p / 3.8, 0, 1);
        car.phase = "launch";
        car.boost = 1 + power * 2.2;
        playLaunch(power);
        if (tipBadge) tipBadge.textContent = `再衝！加成 x${car.boost.toFixed(1)}`;
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function loop(ts) {
    const dt = Math.min(0.05, Math.max(0.001, (ts - state.lastTs) / 1000));
    state.lastTs = ts;
    updateCars(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function attachResize() {
    const ro = new ResizeObserver(() => setCanvasSize());
    ro.observe(canvas);
    window.addEventListener("orientationchange", () => setTimeout(setCanvasSize, 80));
  }

  (async () => {
    setCanvasSize();
    attachResize();
    attachDragControls();

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

    if (state.carsCatalog[0]) onSelect(state.carsCatalog[0]);
    else renderWordCard(null, opts);

    if (countBadge) countBadge.textContent = "0 架車";
    requestAnimationFrame(loop);
  })();
}

game();
