/* TANIDIK Identity Studio */
(function () {
  "use strict";

  const bgC = document.getElementById("bg-canvas");
  const avatarC = document.getElementById("avatar-canvas");
  const rvC = document.getElementById("rv-canvas");
  const bgCtx = bgC ? bgC.getContext("2d") : null;
  const avCtx = avatarC ? avatarC.getContext("2d") : null;
  const rvCtx = rvC ? rvC.getContext("2d") : null;

  const CHAPTER_KEYS = [
    "archetype",
    "skin",
    "hair",
    "eyes",
    "outfit",
    "accessory",
    "codename",
  ];

  const CHAPTER_META = [
    { title: "Archetype", desc: "Pick the energy you bring into every room." },
    { title: "Complexion", desc: "Set the tone of your skin under neon light." },
    { title: "Hair", desc: "Shape the silhouette the crowd remembers." },
    { title: "Gaze", desc: "Eyes that read the room before you speak." },
    { title: "Silhouette", desc: "Dress for the doors that open for you." },
    { title: "Signature", desc: "One detail that makes you unmistakable." },
    { title: "Codename", desc: "What does the city call you?" },
  ];

  const DATA = {
    archetype: [
      { id: 0, label: "Velvet Phantom", accent: "#a050ff" },
      { id: 1, label: "Neon Sovereign", accent: "#50dcff" },
      { id: 2, label: "Gilded Rogue", accent: "#f0c060" },
      { id: 3, label: "Midnight Oracle", accent: "#ff5a82" },
    ],
    skin: [
      { id: 0, color: "#f5d0b5" },
      { id: 1, color: "#e8b896" },
      { id: 2, color: "#c68642" },
      { id: 3, color: "#8d5524" },
      { id: 4, color: "#5c3317" },
      { id: 5, color: "#ffdfc4" },
    ],
    hair: [
      { id: 0, label: "Slick", color: "#1a1a2e" },
      { id: 1, label: "Waves", color: "#2c1810" },
      { id: 2, label: "Buzz", color: "#0d0d1a" },
      { id: 3, label: "Auburn", color: "#6b2c1a" },
      { id: 4, label: "Platinum", color: "#e8e0d0" },
      { id: 5, label: "Gold", color: "#c9a227" },
    ],
    eyes: [
      { id: 0, label: "Amber", color: "#e8ab40" },
      { id: 1, label: "Ice", color: "#80dcff" },
      { id: 2, label: "Violet", color: "#a060ff" },
      { id: 3, label: "Emerald", color: "#4fffb0" },
    ],
    outfit: [
      { id: 0, label: "Velvet", color: "#1e1035" },
      { id: 1, label: "Leather", color: "#121218" },
      { id: 2, label: "Silk", color: "#2a2040" },
      { id: 3, label: "Chrome", color: "#3a3a50" },
    ],
    accessory: [
      { id: 0, label: "None" },
      { id: 1, label: "Chain" },
      { id: 2, label: "Earring" },
      { id: 3, label: "Mask" },
      { id: 4, label: "Aura" },
    ],
  };

  const state = {
    gender: "x",
    chapter: 0,
    archetype: 0,
    skin: 1,
    hair: 0,
    eyes: 0,
    outfit: 0,
    accessory: 0,
    codename: "Nightwalker",
  };

  let bW = 0;
  let bH = 0;
  let rvW = 0;
  let rvH = 0;
  let orbs = [];
  let rvOrbs = [];
  let animId = null;
  let rvAnimId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function buildDots() {
    const wrap = $("ch-dots");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const d = document.createElement("span");
      d.className = "ch-dot" + (i === state.chapter ? " active" : i < state.chapter ? " done" : "");
      wrap.appendChild(d);
    }
  }

  function renderOptions() {
    const key = CHAPTER_KEYS[state.chapter];
    if (key === "codename") return;

    const container = $("ch-" + key);
    if (!container) return;

    const items = DATA[key];
    const stateKey = key;
    const current = state[stateKey];

    container.innerHTML = "";
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ch-opt" + (item.id === current ? " selected" : "");
      if (item.color) {
        const sw = document.createElement("span");
        sw.className = "opt-swatch";
        sw.style.background = item.color;
        btn.appendChild(sw);
      }
      btn.appendChild(document.createTextNode(item.label || ""));
      btn.onclick = function () {
        pickOption(stateKey, item.id);
      };
      container.appendChild(btn);
    });
  }

  function showChapter(n) {
    state.chapter = Math.max(0, Math.min(6, n));
    CHAPTER_KEYS.forEach((key, i) => {
      const el = $("ch-" + key);
      if (!el) return;
      el.classList.toggle("chapter-hidden", i !== state.chapter);
    });

    const meta = CHAPTER_META[state.chapter];
    $("ch-eyebrow").textContent = "Chapter " + (state.chapter + 1) + " of 7";
    $("ch-title").textContent = meta.title;
    $("ch-desc").textContent = meta.desc;

    $("btn-prev").disabled = state.chapter === 0;
    const nextBtn = $("btn-next");
    if (state.chapter === 6) {
      nextBtn.textContent = "Reveal persona";
      nextBtn.classList.add("primary");
    } else {
      nextBtn.textContent = "Continue";
    }

    buildDots();
    renderOptions();
    drawAvatar();
  }

  window.pickOption = function (key, id) {
    state[key] = id;
    renderOptions();
    drawAvatar();
  };

  window.selectGender = function (g) {
    state.gender = g;
    const gate = $("gender-gate");
    if (gate) gate.classList.add("hidden");
    showChapter(0);
    drawAvatar();
    if (!animId) bgLoop();
  };

  window.nextChapter = function () {
    if (state.chapter < 6) {
      showChapter(state.chapter + 1);
    } else {
      openReveal();
    }
  };

  window.prevChapter = function () {
    if (state.chapter > 0) showChapter(state.chapter - 1);
  };

  window.onCodenameInput = function (val) {
    state.codename = (val || "").trim() || "Nightwalker";
    drawAvatar();
  };

  window.enterCity = function () {
    window.location.href = "./discover.html";
  };

  function openReveal() {
    const arch = DATA.archetype[state.archetype];
    $("rv-name").textContent = state.codename || "Nightwalker";
    $("rv-archetype").textContent = arch ? arch.label : "";
    $("reveal-overlay").classList.add("active");
    rvResize();
    initRvOrbs();
    rvLoop();
  }

  /* ── Background canvas ── */
  function bgResize() {
    const parent = bgC.parentElement || document.documentElement;
    const rect = parent.getBoundingClientRect();
    bW = bgC.width = Math.max(1, Math.floor(rect.width));
    bH = bgC.height = Math.max(1, Math.floor(rect.height));
    initOrbs();
  }

  function initOrbs() {
    orbs = [];
    const n = Math.floor((bW * bH) / 18000);
    for (let i = 0; i < Math.max(12, n); i++) {
      orbs.push({
        x: Math.random() * bW,
        y: Math.random() * bH,
        r: 1 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        a: 0.15 + Math.random() * 0.35,
        hue: Math.random() > 0.5 ? 42 : 200,
      });
    }
  }

  function bgLoop() {
    if (!bgCtx) return;
    bgCtx.fillStyle = "#020205";
    bgCtx.fillRect(0, 0, bW, bH);

    const grd = bgCtx.createRadialGradient(bW * 0.3, bH * 0.2, 0, bW * 0.5, bH * 0.5, bW * 0.8);
    grd.addColorStop(0, "rgba(240,192,96,0.06)");
    grd.addColorStop(1, "transparent");
    bgCtx.fillStyle = grd;
    bgCtx.fillRect(0, 0, bW, bH);

    orbs.forEach((o) => {
      o.x += o.vx;
      o.y += o.vy;
      if (o.x < 0) o.x = bW;
      if (o.x > bW) o.x = 0;
      if (o.y < 0) o.y = bH;
      if (o.y > bH) o.y = 0;
      bgCtx.beginPath();
      bgCtx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      bgCtx.fillStyle = o.hue === 42 ? "rgba(240,192,96," + o.a + ")" : "rgba(80,220,255," + o.a * 0.7 + ")";
      bgCtx.fill();
    });

    animId = requestAnimationFrame(bgLoop);
  }

  /* ── Reveal canvas ── */
  function rvResize() {
    const parent = rvC.parentElement || document.documentElement;
    const rect = parent.getBoundingClientRect();
    rvW = rvC.width = Math.max(1, Math.floor(rect.width));
    rvH = rvC.height = Math.max(1, Math.floor(rect.height));
    initRvOrbs();
  }

  function initRvOrbs() {
    rvOrbs = [];
    for (let i = 0; i < 40; i++) {
      rvOrbs.push({
        x: Math.random() * rvW,
        y: Math.random() * rvH,
        r: 2 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        a: 0.2 + Math.random() * 0.5,
      });
    }
  }

  function rvLoop() {
    if (!rvCtx || !$("reveal-overlay").classList.contains("active")) {
      rvAnimId = null;
      return;
    }
    rvCtx.clearRect(0, 0, rvW, rvH);
    const accent = DATA.archetype[state.archetype].accent;
    rvOrbs.forEach((o) => {
      o.x += o.vx;
      o.y += o.vy;
      if (o.x < 0 || o.x > rvW) o.vx *= -1;
      if (o.y < 0 || o.y > rvH) o.vy *= -1;
      rvCtx.beginPath();
      rvCtx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      rvCtx.fillStyle = hexA(accent, o.a);
      rvCtx.fill();
    });
    rvAnimId = requestAnimationFrame(rvLoop);
  }

  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  /* ── Avatar renderer ── */
  function drawAvatar() {
    if (!avCtx || !avatarC) return;
    const w = avatarC.width;
    const h = avatarC.height;
    const cx = w / 2;
    const arch = DATA.archetype[state.archetype];
    const skin = DATA.skin[state.skin].color;
    const hair = DATA.hair[state.hair];
    const eye = DATA.eyes[state.eyes];
    const outfit = DATA.outfit[state.outfit];
    const acc = state.accessory;

    avCtx.clearRect(0, 0, w, h);

    const bgG = avCtx.createLinearGradient(0, 0, 0, h);
    bgG.addColorStop(0, "#0d0d1a");
    bgG.addColorStop(1, "#020205");
    avCtx.fillStyle = bgG;
    avCtx.fillRect(0, 0, w, h);

    const glow = avCtx.createRadialGradient(cx, h * 0.45, 0, cx, h * 0.45, w * 0.55);
    glow.addColorStop(0, hexA(arch.accent, 0.25));
    glow.addColorStop(1, "transparent");
    avCtx.fillStyle = glow;
    avCtx.fillRect(0, 0, w, h);

    const shoulderW = state.gender === "m" ? 130 : state.gender === "f" ? 118 : 124;
    const neckY = h * 0.42;

    avCtx.fillStyle = outfit.color;
    roundRect(avCtx, cx - shoulderW / 2, h * 0.52, shoulderW, h * 0.38, 24);
    avCtx.fill();

    avCtx.fillStyle = skin;
    const headR = state.gender === "m" ? 72 : 68;
    avCtx.beginPath();
    avCtx.ellipse(cx, neckY, headR * 0.85, headR, 0, 0, Math.PI * 2);
    avCtx.fill();

    avCtx.fillStyle = skin;
    avCtx.fillRect(cx - 18, neckY + headR * 0.5, 36, 28);

    drawHair(avCtx, cx, neckY, headR, hair, state.gender);

    avCtx.fillStyle = "#0a0a12";
    const eyeY = neckY - 8;
    const eyeOff = state.gender === "m" ? 26 : 24;
    avCtx.beginPath();
    avCtx.ellipse(cx - eyeOff, eyeY, 14, 10, 0, 0, Math.PI * 2);
    avCtx.ellipse(cx + eyeOff, eyeY, 14, 10, 0, 0, Math.PI * 2);
    avCtx.fill();

    avCtx.fillStyle = eye.color;
    avCtx.beginPath();
    avCtx.arc(cx - eyeOff, eyeY, 6, 0, Math.PI * 2);
    avCtx.arc(cx + eyeOff, eyeY, 6, 0, Math.PI * 2);
    avCtx.fill();

    avCtx.fillStyle = "rgba(255,255,255,0.35)";
    avCtx.beginPath();
    avCtx.arc(cx - eyeOff + 2, eyeY - 2, 2, 0, Math.PI * 2);
    avCtx.arc(cx + eyeOff + 2, eyeY - 2, 2, 0, Math.PI * 2);
    avCtx.fill();

    drawAccessory(avCtx, cx, neckY, headR, acc);

    avCtx.font = 'italic 300 22px "Cormorant Garamond", Georgia, serif';
    avCtx.fillStyle = "rgba(240,192,96,0.9)";
    avCtx.textAlign = "center";
    avCtx.fillText(state.codename || "Nightwalker", cx, h - 28);

    avCtx.font = '600 9px "DM Mono", monospace';
    avCtx.fillStyle = "rgba(155,163,178,0.8)";
    avCtx.fillText(arch.label.toUpperCase(), cx, h - 12);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawHair(ctx, cx, cy, r, hair, gender) {
    ctx.fillStyle = hair.color;
    const style = hair.id;
    if (style === 0) {
      roundRect(ctx, cx - r * 0.95, cy - r * 1.2, r * 1.9, r * 0.7, 12);
      ctx.fill();
    } else if (style === 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.9, r * 1.1, r * 0.95, 0, Math.PI, 0);
      ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(cx + i * 18, cy + r * 0.3, 12, 40, 0.1 * i, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === 2) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 1.05, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 1.0, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAccessory(ctx, cx, cy, r, accId) {
    if (accId === 0) return;
    ctx.strokeStyle = "#f0c060";
    ctx.lineWidth = 2;
    if (accId === 1) {
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.9, 22, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (accId === 2) {
      ctx.fillStyle = "#f0c060";
      ctx.beginPath();
      ctx.arc(cx - r * 0.75, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (accId === 3) {
      ctx.fillStyle = "rgba(13,13,26,0.85)";
      roundRect(ctx, cx - 40, cy - 10, 80, 28, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(240,192,96,0.5)";
      ctx.stroke();
    } else if (accId === 4) {
      const g = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.8);
      g.addColorStop(0, "rgba(240,192,96,0.2)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initChapters() {
    CHAPTER_KEYS.forEach((key) => {
      if (key === "codename") return;
      const c = $("ch-" + key);
      if (!c) return;
      DATA[key].forEach((item) => {
        if (!item.label && item.color) item.label = "";
      });
    });
    DATA.skin.forEach((s, i) => {
      s.label = ["Porcelain", "Warm", "Honey", "Caramel", "Espresso", "Moon"][i];
    });
  }

  function boot() {
    initChapters();
    buildDots();
    bgResize();
    window.addEventListener("resize", function () {
      bgResize();
      rvResize();
    });
    drawAvatar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
