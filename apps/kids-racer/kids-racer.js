import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

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

function hexToHsl(hex) {
  const c = new THREE.Color(hex);
  const r = c.r;
  const g = c.g;
  const b = c.b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 1) * 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const col = new THREE.Color(r + m, g + m, b + m);
  return `#${col.getHexString()}`;
}

function variedColor(baseHex) {
  const hsl = hexToHsl(baseHex);
  const h = (hsl.h + (Math.random() - 0.5) * 0.16 + 1) % 1;
  const s = clamp(hsl.s + (Math.random() - 0.5) * 0.18, 0.25, 0.95);
  const l = clamp(hsl.l + (Math.random() - 0.5) * 0.12, 0.25, 0.80);
  return hslToHex({ h, s, l });
}

function buildTrackCurve(w, h) {
  const size = Math.min(w, h);
  const rx = size * 0.34;
  const rz = size * 0.26;
  const n = 180;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.05 * Math.sin(t * 3);
    pts.push(
      new THREE.Vector3(Math.cos(t) * rx * wobble, 0, Math.sin(t) * rz * wobble)
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.12);
  curve.arcLengthDivisions = 600;
  return curve;
}

function makeCarModel(kind, hex) {
  const group = new THREE.Group();

  const paint = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.55,
    metalness: 0.15,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1b1b1b"),
    roughness: 0.8,
    metalness: 0.05,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#2b3440"),
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.75,
  });

  const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 18);
  const wheel = (x, z) => {
    const m = new THREE.Mesh(wheelGeo, dark);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, 0.22, z);
    group.add(m);
  };

  let bodyLen = 2.1;
  let bodyH = 0.55;
  let bodyW = 1.05;
  let cabLen = 0.85;
  let cabH = 0.45;
  let cabZ = -0.05;

  if (kind === "sports") {
    bodyLen = 2.2;
    bodyH = 0.45;
    bodyW = 1.05;
    cabLen = 0.9;
    cabH = 0.35;
    cabZ = -0.05;
  } else if (kind === "construction") {
    bodyLen = 2.35;
    bodyH = 0.62;
    bodyW = 1.10;
    cabLen = 0.75;
    cabH = 0.55;
    cabZ = 0.55;
  } else if (kind === "ambulance") {
    bodyLen = 2.35;
    bodyH = 0.58;
    bodyW = 1.10;
    cabLen = 1.05;
    cabH = 0.60;
    cabZ = -0.05;
  } else if (kind === "firetruck") {
    bodyLen = 2.45;
    bodyH = 0.62;
    bodyW = 1.12;
    cabLen = 0.95;
    cabH = 0.58;
    cabZ = 0.05;
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, bodyH, bodyW), paint);
  body.position.set(0, bodyH / 2 + 0.22, 0);
  group.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(cabLen, cabH, bodyW * 0.92), glass);
  cab.position.set(-bodyLen * 0.08, bodyH + cabH / 2 + 0.22, cabZ);
  group.add(cab);

  wheel(bodyLen * 0.35, bodyW * 0.42);
  wheel(bodyLen * 0.35, -bodyW * 0.42);
  wheel(-bodyLen * 0.35, bodyW * 0.42);
  wheel(-bodyLen * 0.35, -bodyW * 0.42);

  if (kind === "construction") {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, bodyW * 0.92), paint);
    bed.position.set(0.55, bodyH + 0.42 / 2 + 0.22, 0);
    bed.rotation.z = -0.06;
    group.add(bed);
  }

  if (kind === "ambulance") {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(bodyLen * 0.95, 0.10, bodyW * 0.98),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 0.65,
        metalness: 0.05,
      })
    );
    stripe.position.set(0, 0.55, 0);
    group.add(stripe);

    const crossMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ff2d2d"),
      roughness: 0.55,
      metalness: 0.05,
    });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.12), crossMat);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.42), crossMat);
    const cross = new THREE.Group();
    cross.add(bar1, bar2);
    cross.position.set(0.60, bodyH + 0.22, 0);
    group.add(cross);
  }

  if (kind === "firetruck") {
    const ladderMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#f5f1e6"),
      roughness: 0.65,
      metalness: 0.1,
    });
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.18), ladderMat);
    ladder.position.set(0.55, bodyH + 0.65, 0);
    ladder.rotation.z = -0.15;
    group.add(ladder);
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  group.userData.kind = kind;
  return group;
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

  const countBadge = $("#countBadge");
  const tipBadge = $("#tipBadge");

  const speedDown = $("#speedDown");
  const speedUp = $("#speedUp");
  const reset = $("#reset");

  const toggleSpeech = $("#toggleSpeech");
  const opts = {
    speed: 120, // 基礎速度
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
    lastTs: performance.now(),
    spawnLane: 0,
    dragging: null,
  };

  // --- Three.js scene setup ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color("#0f0d08"), 18, 58);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  camera.position.set(0, 10.2, 14.5);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xfff3cc, 0x19130c, 0.95);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xfff3cc, 1.05);
  dir.position.set(10, 14, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 40;
  dir.shadow.camera.left = -18;
  dir.shadow.camera.right = 18;
  dir.shadow.camera.top = 18;
  dir.shadow.camera.bottom = -18;
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 60),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color("#12100b"),
      roughness: 1.0,
      metalness: 0.0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  let trackCurve = null;
  let trackLen = 1;
  let trackMesh = null;
  let laneWidth = 0.55;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dragHit = new THREE.Vector3();
  const tmp = {
    p: new THREE.Vector3(),
    t: new THREE.Vector3(),
    n: new THREE.Vector3(),
  };

  function setCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, rect.width);
    const h = Math.max(10, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    trackCurve = buildTrackCurve(w, h);
    trackLen = trackCurve.getLength();
    laneWidth = Math.max(0.44, Math.min(0.72, Math.min(w, h) / 900));

    if (trackMesh) scene.remove(trackMesh);
    const tube = new THREE.TubeGeometry(trackCurve, 380, 0.58, 10, true);
    trackMesh = new THREE.Mesh(
      tube,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0a0a0a"),
        roughness: 0.95,
        metalness: 0.05,
      })
    );
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);
  }

  function getLaneOffset(laneIdx) {
    const lanes = 4;
    const centered = laneIdx - (lanes - 1) / 2; // -1.5..+1.5
    return centered * laneWidth;
  }

  function curveFrame(u, laneOffset) {
    const uu = (u % 1 + 1) % 1;
    trackCurve.getPointAt(uu, tmp.p);
    trackCurve.getTangentAt(uu, tmp.t);
    tmp.t.normalize();
    tmp.n.set(-tmp.t.z, 0, tmp.t.x).normalize(); // left normal on XZ
    const pos = tmp.p.clone().add(tmp.n.multiplyScalar(laneOffset));
    const yaw = Math.atan2(tmp.t.x, tmp.t.z); // forward is +Z
    return { pos, yaw, tangent: tmp.t.clone(), normal: tmp.n.clone() };
  }

  function spawnCar(carDef) {
    const lane = state.spawnLane++ % 4;
    const paintHex = variedColor(carDef.color);
    const model = makeCarModel(carDef.id, paintHex);
    model.userData.carId = carDef.id;
    model.userData.liveId = `${carDef.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    scene.add(model);

    state.carsLive.push({
      id: model.userData.liveId,
      def: carDef,
      mesh: model,
      u: 0, // 0..1 along curve
      lane,
      pull: 0,
      boost: 1,
      boostT: 0,
      mode: "aim", // aim -> run
    });

    if (countBadge) countBadge.textContent = `${state.carsLive.length} 架車`;
    if (tipBadge) tipBadge.textContent = "已放車！拖住架車向後拉，放手就衝前～";

    if (opts.speechEnabled && carDef?.sentences?.[0]) speakText(carDef.sentences[0]);
  }

  function clearCars() {
    for (const car of state.carsLive) {
      if (car.mesh) scene.remove(car.mesh);
    }
    state.carsLive = [];
    if (countBadge) countBadge.textContent = "0 架車";
    if (tipBadge) tipBadge.textContent = "提示：按下面按鈕放車";
  }

  if (reset) reset.addEventListener("click", clearCars);

  function updateCars(dt) {
    if (!trackCurve) return;
    const baseMetersPerSec = (opts.speed / 120) * 6.8;
    const baseUPerSec = baseMetersPerSec / Math.max(0.0001, trackLen);

    for (const car of state.carsLive) {
      if (!car.mesh) continue;

      if (car.mode === "run") {
        if (car.boostT > 0) {
          car.boostT = Math.max(0, car.boostT - dt);
          const t = car.boostT / 0.9;
          car.boost = 1 + (car.boost - 1) * t;
        } else {
          car.boost = 1;
        }
        car.u = (car.u + baseUPerSec * car.boost * dt) % 1;
      }

      const laneOffset = getLaneOffset(car.lane);
      const pullBack = car.mode === "aim" ? car.pull : 0;
      const uVisual = (car.u - pullBack / Math.max(0.0001, trackLen) + 1) % 1;
      const frame = curveFrame(uVisual, laneOffset);

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
    const meshes = [];
    for (const car of state.carsLive) {
      if (car.mesh) meshes.push(car.mesh);
    }
    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return null;

    let obj = hits[0].object;
    while (obj && !obj.userData?.liveId) obj = obj.parent;
    const liveId = obj?.userData?.liveId;
    if (!liveId) return null;
    return state.carsLive.find((c) => c.id === liveId) || null;
  }

  function attachDragControls() {
    canvas.style.touchAction = "none";

    const onDown = (e) => {
      setPointerFromEvent(e);
      const car = hitTestCar();
      if (!car) return;
      e.preventDefault();
      state.dragging = {
        car,
        startU: car.u,
        startPull: car.pull,
      };
      car.mode = "aim";
      if (tipBadge) tipBadge.textContent = "拉後再放手：拉得越多，衝得越快！";
    };

    const onMove = (e) => {
      if (!state.dragging) return;
      setPointerFromEvent(e);
      raycaster.setFromCamera(pointerNdc, camera);
      if (!raycaster.ray.intersectPlane(dragPlane, dragHit)) return;

      const { car } = state.dragging;
      const laneOffset = getLaneOffset(car.lane);
      const frame = curveFrame(car.u, laneOffset);

      // pull = distance along -tangent (backwards)
      const toHit = dragHit.clone().sub(frame.pos);
      const backward = frame.tangent.clone().multiplyScalar(-1);
      const pull = clamp(toHit.dot(backward), 0, 4.2);
      car.pull = pull;
    };

    const onUp = () => {
      if (!state.dragging) return;
      const { car } = state.dragging;
      const p = car.pull;
      car.pull = 0;
      car.mode = "run";
      const boost = 1 + (p / 4.2) * 2.1; // 1..~3.1
      car.boost = boost;
      car.boostT = 0.9;
      state.dragging = null;
      if (tipBadge) tipBadge.textContent = `衝！速度加成 x${boost.toFixed(1)}（會慢慢回復）`;
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function loop(ts) {
    const dt = Math.min(0.033, Math.max(0.001, (ts - state.lastTs) / 1000));
    state.lastTs = ts;
    updateCars(dt);
    renderer.render(scene, camera);
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

    // 預設顯示第一架車的字卡（如果有）
    if (state.carsCatalog[0]) onSelect(state.carsCatalog[0]);
    else renderWordCard(null, opts);

    if (countBadge) countBadge.textContent = "0 架車";
    requestAnimationFrame(loop);
  })();
}

game();

