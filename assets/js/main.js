/* ==========================================================================
   MAIN · 渲染 + 交互 + 编辑模式
   - 内容全部来自 content.js 里的 window.SITE，这里只负责画出来
   - 每个 render* 函数对应一页；改某页结构就改对应函数
   - 图形生成器（半调球体、条纹块、小图标）在 ART 区，P1 / P6 / P7 共用
   - 编辑模式：导航里的 Edit，或 Shift + E
   ========================================================================== */
(() => {
  "use strict";

  const SITE = window.SITE;
  const STORE_KEY = "pxu-site-edits-v5";
  const RAD = Math.PI / 180;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let editing = false;

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const f1 = (n) => n.toFixed(1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssUrl = (src) => `url("${String(src).replace(/"/g, "%22")}")`;
  const isVideo = (src) => /\.(mp4|webm|mov)$/i.test(src || "");
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

  function setPath(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.length ? getPath(obj, keys.join(".")) : obj;
    if (parent == null || typeof parent !== "object" || !(last in parent)) return false;
    parent[last] = value;
    return true;
  }

  // 固定种子的随机数，保证撕纸边缘、地形每次刷新都一样
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 可编辑文字：data-edit 指向 SITE 里的字段路径
  const ed = (path, tag = "span", cls = "", attrs = "") =>
    `<${tag}${cls ? ` class="${cls}"` : ""}${attrs} data-edit="${path}">${esc(getPath(SITE, path))}</${tag}>`;

  // 图片位：有图显示图（.mp4 / .webm 显示视频），没图显示统一风格的占位框
  // autoplay 只给一直可见的位置用（P3 黑卡）；攀岩视频悬停时才播放
  function slot(path, label, ratio, cls = "", alt = "", autoplay = false) {
    const src = getPath(SITE, path);
    const style = ratio ? ` style="aspect-ratio:${ratio}"` : "";
    if (src && isVideo(src)) {
      // 不自动播放的视频先不加载（攀岩视频体积大，悬停时才开始下载）
      return `<div class="slot ${cls}" data-img="${path}"${style}><video src="${esc(src)}" muted loop playsinline preload="${autoplay ? "auto" : "none"}"${autoplay ? " autoplay" : ""}></video></div>`;
    }
    if (src) {
      const lazy = cls.includes("slot--fit") ? "" : ` loading="lazy"`;
      return `<div class="slot ${cls}" data-img="${path}"${style}><img src="${esc(src)}" alt="${esc(alt)}"${lazy}></div>`;
    }
    const ratioText = ratio ? `<br>${ratio.replace(/\s/g, "")}` : "";
    return `<div class="slot slot--empty ${cls}" data-img="${path}"${style}><span class="slot__label">${esc(label)}${ratioText}</span></div>`;
  }

  // 标题 + 一句说明（content.js 里有 lede 字段的页面才显示）
  // 原比例图位（P3 截图、P4 详情大图）：先记下图片真实比例，切换时外框直接按原比例占位，不会跳动
  const natural = {};
  const measure = (src) => {
    if (!src || isVideo(src) || natural[src]) return;
    const im = new Image();
    im.onload = () => { natural[src] = `${im.naturalWidth} / ${im.naturalHeight}`; };
    im.src = src;
  };
  const fitRatio = (src, fallback) => (src ? natural[src] || null : fallback);

  const head = (key, extra = "") => `
    <header class="page__head">
      ${ed(`${key}.title`, "h2", "page__title", ` id="${key}-title"`)}
      ${SITE[key] && "lede" in SITE[key] ? ed(`${key}.lede`, "p", "page__lede") : ""}
      ${extra}
    </header>`;

  // 定位线 + 十字标（参考模板里的网格海报）
  const frame = () =>
    `<div class="frame" aria-hidden="true"><i class="frame__v"></i><i class="frame__h"></i><i class="frame__reg"></i></div>`;

  /* ======================================================================
     ART · 图形生成器（全部输出 SVG 片段，颜色由 CSS 的 .art-* 决定）
     ====================================================================== */

  // 半调球体：点的大小 = 球面暗部深浅（光从左上来，右下最暗，点大到连成实心）
  function halftoneSphere(cx, cy, R, pitch, max = 0.66) {
    const L = [-0.55, -0.62, 0.56];
    const len = Math.hypot(...L);
    const n = Math.ceil((R * 1.5) / pitch);
    let out = "";
    for (let u = -n; u <= n; u++) {
      for (let v = -n; v <= n; v++) {
        const x = cx + (u - v) * pitch * Math.SQRT1_2;   // 45° 网点角度
        const y = cy + (u + v) * pitch * Math.SQRT1_2;
        const dx = (x - cx) / R, dy = (y - cy) / R, d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const dz = Math.sqrt(1 - d2);
        const lit = Math.max(0, (dx * L[0] + dy * L[1] + dz * L[2]) / len);
        const r = Math.max(0.8, pitch * max * Math.pow(1 - lit, 0.85));
        out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r.toFixed(2)}"/>`;
      }
    }
    return out;
  }

  // 半调椭圆（投影）
  function halftoneEllipse(cx, cy, rx, ry, pitch, max = 0.5) {
    let out = "";
    for (let y = cy - ry; y <= cy + ry; y += pitch * 0.75) {
      for (let x = cx - rx; x <= cx + rx; x += pitch) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (d > 1) continue;
        const r = pitch * max * Math.pow(1 - d, 0.6);
        if (r > 0.7) out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r.toFixed(2)}"/>`;
      }
    }
    return out;
  }

  // 竖条纹块（参考土耳其邮票）：face 内的条纹变细，形成一个斜切的“面”
  function stripeBlock(x0, y0, x1, y1, pitch, w, face) {
    const bar = (x, ya, yb, bw) => `<rect x="${f1(x - bw / 2)}" y="${f1(ya)}" width="${f1(bw)}" height="${f1(yb - ya)}"/>`;
    let out = "";
    for (let x = x0 + pitch / 2; x < x1; x += pitch) {
      if (face && x > face.xa && x < face.xb) {
        const t = (x - face.xa) / (face.xb - face.xa);
        const yt = face.top[0] + (face.top[1] - face.top[0]) * t;
        const yb = face.bot[0] + (face.bot[1] - face.bot[0]) * t;
        out += bar(x, y0, yt, w) + bar(x, yt, yb, w * 0.3) + bar(x, yb, y1, w);
      } else {
        out += bar(x, y0, y1, w);
      }
    }
    return out;
  }

  // 三角楔形，内部填平行斜线
  function stripeWedge(id, P1, P2, P3, pitch, w) {
    const dl = Math.hypot(P1[0] - P3[0], P1[1] - P3[1]);
    const dir = [(P1[0] - P3[0]) / dl, (P1[1] - P3[1]) / dl];
    const nrm = [-dir[1], dir[0]];
    const proj = [P1, P2, P3].map((p) => p[0] * nrm[0] + p[1] * nrm[1]);
    let lines = "";
    for (let s = Math.min(...proj) + pitch / 2; s <= Math.max(...proj); s += pitch) {
      const c = [nrm[0] * s, nrm[1] * s];
      lines += `<line x1="${f1(c[0] - dir[0] * 3000)}" y1="${f1(c[1] - dir[1] * 3000)}" x2="${f1(c[0] + dir[0] * 3000)}" y2="${f1(c[1] + dir[1] * 3000)}"/>`;
    }
    const pts = [P1, P2, P3].map((p) => p.join(",")).join(" ");
    return `<clipPath id="${id}"><polygon points="${pts}"/></clipPath>
      <g class="art-lines" clip-path="url(#${id})" stroke-width="${w}">${lines}</g>`;
  }

  // 橙色半圆 + 外圈小字
  function halfDisc(cx, cy, r, rot, id, text) {
    const tr = r + 13;
    return `<g transform="rotate(${rot} ${cx} ${cy})">
      <path class="art-orange" d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z"/>
      <path id="${id}" d="M${cx - tr} ${cy} A${tr} ${tr} 0 0 1 ${cx + tr} ${cy}" fill="none"/>
      ${text ? `<text class="art-mono"><textPath href="#${id}" startOffset="52%">${esc(text)}</textPath></text>` : ""}
    </g>`;
  }

  // 小图标（参考 Strata）
  function discStack(x, y, h) {
    const r = h / 2;
    let out = "";
    for (let i = 0; i < 3; i++) {
      const cx = x + r + i * r * 0.78;
      out += `<path class="art-ink art-cut" d="M${f1(cx)} ${y} A${r} ${r} 0 0 0 ${f1(cx)} ${y + h} Z"/>`;
    }
    return out;
  }

  function rings(x, y, r, id) {
    const a = [x + r, y + r], b = [x + r * 2.15, y + r];
    let hatch = "";
    for (let hx = b[0] - r; hx <= b[0] + r; hx += 3) {
      const dy = Math.sqrt(Math.max(0, r * r - (hx - b[0]) ** 2));
      hatch += `<line x1="${f1(hx)}" y1="${f1(b[1] - dy)}" x2="${f1(hx)}" y2="${f1(b[1] + dy)}"/>`;
    }
    return `<clipPath id="${id}"><circle cx="${a[0]}" cy="${a[1]}" r="${r}"/></clipPath>
      <circle class="art-mint" cx="${b[0]}" cy="${b[1]}" r="${r}"/>
      <circle class="art-orange" cx="${a[0]}" cy="${a[1]}" r="${r}"/>
      <g class="art-hatch" clip-path="url(#${id})">${hatch}</g>`;
  }

  function truss(x, y, s, n) {
    let out = `<rect x="${x}" y="${y}" width="${s * n}" height="${s}"/>`;
    for (let i = 0; i < n; i++) {
      out += `<line x1="${x + i * s}" y1="${y}" x2="${x + i * s}" y2="${y + s}"/><line x1="${x + i * s}" y1="${y}" x2="${x + (i + 1) * s}" y2="${y + s}"/>`;
    }
    return `<g class="art-stroke">${out}</g>`;
  }

  const dots3 = (x, y, r, gap) =>
    [0, 1, 2].map((i) => `<circle class="art-ink" cx="${x + i * gap}" cy="${y}" r="${r}"/>`).join("");

  const bars = (x, y, w, h, gap) =>
    ["art-orange", "art-teal", "art-mint", "art-faint"]
      .map((c, i) => `<rect class="${c}" x="${x}" y="${y + i * (h + gap)}" width="${w}" height="${h}"/>`).join("");

  function ellipseRow(x, y, n, gap, ry, rxMax) {
    let out = "";
    for (let i = 0; i < n; i++) {
      const rx = 2.5 + rxMax * Math.pow(Math.sin((Math.PI * (i + 0.5)) / n), 2.2);
      out += `<ellipse class="art-ink" cx="${f1(x + i * gap)}" cy="${y}" rx="${f1(rx)}" ry="${ry}"/>`;
    }
    return out;
  }

  // 方形半调块：点从一角往另一角逐渐变大（P6 用）。pitch 越小网点越细
  function halftoneTile(seed, pitch = 7) {
    const r = rng(seed);
    const ang = r() * Math.PI * 2;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    let out = "";
    for (let y = pitch / 2; y < 100; y += pitch) {
      for (let x = pitch / 2; x < 100; x += pitch) {
        const t = Math.min(1, Math.max(0, ((x - 50) * ux + (y - 50) * uy) / 70 + 0.5));
        const rad = pitch * (0.07 + 0.49 * Math.pow(t, 1.4));
        out += `<circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}"/>`;
      }
    }
    return `<svg class="art-fill" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="art-ink">${out}</g></svg>`;
  }

  // 坐标纸上的一族函数曲线
  function graphSvg(seed) {
    const r = rng(seed);
    const shift = 30 + r() * 30;
    let paths = "";
    for (let k = 1; k <= 10; k++) {
      let d = "";
      for (let x = 0; x <= 100; x += 2) {
        const y = 100 - (k * 9) * Math.exp(-Math.pow((x - shift) / (16 + k * 5), 2));
        d += `${x ? "L" : "M"}${x} ${y.toFixed(1)} `;
      }
      paths += `<path d="${d}"/>`;
    }
    return `<svg class="art-fill piece__graph" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
  }

  /* ======================================================================
     NAV
     ====================================================================== */
  function renderNav() {
    $("#nav").innerHTML = `
      <a class="chip chip--solid nav__logo" href="#hero">${esc(SITE.meta.name)}</a>
      <div class="nav__links" id="navLinks">
        ${SITE.nav.map((n) => `<a class="chip" href="#${n.target}" data-target="${n.target}">${esc(n.label)}</a>`).join("")}
      </div>
      <div class="nav__tools">
        <button class="chip nav__menu" type="button" aria-expanded="false" aria-controls="navLinks">Index</button>
        ${SITE.meta.showEditButton ? `<button class="chip nav__edit" type="button" aria-pressed="false">Edit</button>` : ""}
      </div>`;
  }

  /* ======================================================================
     P1 · HERO  半调球体 + 条纹块 + 楔形 + 橙色半圆 + 小图标
     画布 1440 × 900，坐标都在这里，改数字就能挪位置
     ====================================================================== */
  function heroArt() {
    const h = SITE.hero;
    const tags = (h.tags || []).map((t, i) => `<text class="art-mono" x="800" y="${836 + i * 18}">${esc(t)}</text>`).join("");
    return `<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <g class="art-ink">${halftoneEllipse(452, 720, 196, 24, 11)}${halftoneSphere(330, 438, 250, 11)}</g>
      <g class="art-ink">${stripeBlock(800, 96, 1376, 792, 12, 6.4, { xa: 892, xb: 1296, top: [196, 252], bot: [628, 684] })}</g>
      ${stripeWedge("heroWedge", [800, 548], [800, 792], [578, 772], 12, 5.2)}
      ${halfDisc(671, 678, 74, -45.3, "heroArc", h.arcText)}
      ${discStack(64, 100, 44)}
      ${rings(168, 100, 22, "heroRings")}
      ${truss(266, 100, 44, 5)}
      ${tags}
      ${dots3(1104, 832, 4, 14)}
      ${bars(1168, 824, 208, 5, 5)}
    </svg>`;
  }

  function renderHero() {
    $("#hero").innerHTML = `
      <div class="hero__field stamp" aria-hidden="true">${heroArt()}</div>
      ${ed("hero.name", "h1", "hero__name")}
      ${ed("hero.intro", "p", "hero__intro")}`;
  }

  /* ======================================================================
     P2 · I EXPLORE.  3D 等高线地图 + 经历路线
     地形 = 整体抬升（左下低、右上高）+ 一条蜿蜒的峡谷 + 随机山包 + 低频噪声，
     用 d3-contour 切成 10 层，每层叠一层阴影，像纸片堆出来的地形。
     ====================================================================== */
  const MAP_W = 1600, MAP_H = 1000;
  const TOPO_LEVELS = 10;

  function terrainField(seed, nx, ny) {
    const r = rng(seed * 7919 + 13);
    const fade = (t) => t * t * (3 - 2 * t);
    const lattice = (f) => ({ f, g: Array.from({ length: (f + 1) * (f + 1) }, r) });
    const sample = ({ f, g }, u, v) => {
      const x = u * f, y = v * f;
      const i = Math.min(f - 1, Math.floor(x)), j = Math.min(f - 1, Math.floor(y));
      const tx = fade(x - i), ty = fade(y - j);
      const a = g[j * (f + 1) + i], b = g[j * (f + 1) + i + 1];
      const c = g[(j + 1) * (f + 1) + i], d = g[(j + 1) * (f + 1) + i + 1];
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    };
    const octaves = [[lattice(3), 0.6], [lattice(6), 0.3], [lattice(11), 0.1]];
    const bumps = Array.from({ length: 6 }, () => ({
      x: 0.06 + r() * 0.88, y: 0.08 + r() * 0.84, s: 0.07 + r() * 0.12, a: (r() - 0.3) * 0.5,
    }));
    // 峡谷：沿一条正弦曲线往下挖，谷壁的等高线会挤在一起，阴影最重
    const canyon = { x: 0.36 + r() * 0.2, amp: 0.08 + r() * 0.06, freq: 4 + r() * 3, ph: r() * 6.28 };
    const vals = new Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const u = i / (nx - 1), v = j / (ny - 1);
        let h = 0.3 * u + 0.2 * (1 - v);
        const cx = canyon.x + canyon.amp * Math.sin(v * canyon.freq + canyon.ph);
        h -= 0.42 * Math.exp(-(((u - cx) / 0.075) ** 2));
        bumps.forEach((b) => {
          const d2 = (u - b.x) ** 2 + ((v - b.y) * (MAP_H / MAP_W)) ** 2;
          h += b.a * Math.exp(-d2 / (b.s * b.s));
        });
        h += 0.5 * octaves.reduce((s, [o, amp]) => s + amp * (sample(o, u, v) - 0.5), 0);
        vals[j * nx + i] = h;
        lo = Math.min(lo, h); hi = Math.max(hi, h);
      }
    }
    return vals.map((h) => (h - lo) / (hi - lo));
  }

  // 闭合折线做一次 Chaikin 平滑，去掉网格带来的折角
  function smoothRing(ring) {
    const p = ring.slice(0, -1), q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    return q;
  }

  function topoLayers(seed) {
    const nx = 128, ny = 80;
    const sx = MAP_W / nx, sy = MAP_H / ny;
    const tone = (a) => `rgb(${Math.round(245 * (1 - a))},${Math.round(243 * (1 - a))},${Math.round(238 * (1 - a))})`;
    let out = `<rect width="${MAP_W}" height="${MAP_H}" fill="${tone(0.3)}"/>`;
    if (!window.d3 || !window.d3.contours) return out; // 外部库没加载时只显示底色
    const values = terrainField(seed, nx, ny);
    const thresholds = Array.from({ length: TOPO_LEVELS }, (_, k) => (k + 1) / (TOPO_LEVELS + 1));
    window.d3.contours().size([nx, ny]).thresholds(thresholds)(values).forEach((layer, k) => {
      const d = layer.coordinates.map((poly) => poly.map((ring) =>
        "M" + smoothRing(ring).map(([x, y]) => `${f1(x * sx)} ${f1(y * sy)}`).join("L") + "Z").join("")).join("");
      if (!d) return;
      const a = 0.24 * Math.pow(1 - k / (TOPO_LEVELS - 1), 1.3);
      out += `<path class="topo-layer" filter="url(#topoShadow)" fill="${tone(a)}" d="${d}"/>`;
    });
    return out;
  }

  // 地图网格 + 边缘坐标（A-H / 1-5）
  function mapGrid() {
    let out = "";
    for (let i = 1; i < 8; i++) out += `<line x1="${i * 200}" y1="0" x2="${i * 200}" y2="${MAP_H}"/>`;
    for (let j = 1; j < 5; j++) out += `<line x1="0" y1="${j * 200}" x2="${MAP_W}" y2="${j * 200}"/>`;
    for (let i = 0; i < 8; i++) out += `<text x="${i * 200 + 100}" y="30" text-anchor="middle">${"ABCDEFGH"[i]}</text>`;
    for (let j = 0; j < 5; j++) out += `<text x="22" y="${j * 200 + 106}" text-anchor="middle">${j + 1}</text>`;
    return `<g class="map__grid">${out}</g>`;
  }

  function mapRoute(points) {
    const pts = points.map(([x, y]) => `${x * 16},${y * 10}`).join(" ");
    const nodes = points.map(([x, y], i) => `
      <g class="map__node" transform="translate(${x * 16} ${y * 10})">
        <circle r="11"/><circle class="map__node-in" r="4"/>
        <text x="18" y="-14">${pad(i + 1)}</text>
      </g>`).join("");
    return `<polyline class="map__route-halo" points="${pts}"/><polyline class="map__route" points="${pts}"/>${nodes}`;
  }

  function renderExplore() {
    const e = SITE.explore;
    const points = e.items.map((it) => it.at || [50, 50]);
    const stops = e.items.map((it, i) => {
      const p = `explore.items.${i}`;
      const [cx, cy] = it.card || [0, 0];
      const lh = it.logoH ? `--lh:${Math.round(it.logoH * 0.78)}px` : "";
      const logo = it.logo
        ? `<span class="stop__logo" data-img="${p}.logo" style="${lh}"><img src="${esc(it.logo)}" alt="${esc(it.title)} logo"></span>`
        : `<span class="stop__logo slot--empty" data-img="${p}.logo"><span class="slot__label">Logo</span></span>`;
      return `
        <article class="stop" data-stop="${i}" style="--x:${cx}%;--y:${cy}%">
          <div class="stop__bar">${ed(`${p}.date`)}<span>${pad(i + 1)}</span></div>
          <div class="stop__body">
            ${slot(`${p}.image`, "Image", "4 / 5", "stop__media", it.title)}
            <div class="stop__text">
              ${logo}
              ${ed(`${p}.title`, "h3", "stop__title")}
              ${ed(`${p}.intro`, "p", "stop__intro")}
            </div>
          </div>
        </article>`;
    }).join("");

    $("#explore").innerHTML = `
      ${head("explore")}
      <div class="map">
        <svg class="map__terrain" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none" aria-hidden="true">
          ${topoLayers(e.seed)}${mapGrid()}${mapRoute(points)}
        </svg>
        <svg class="map__leaders" aria-hidden="true"></svg>
        ${stops}
      </div>`;
  }

  // 节点到卡片的引线：按实际尺寸计算，窗口变化时重画
  function drawLeaders() {
    const map = $(".map");
    const svg = $(".map__leaders", map);
    if (!svg || getComputedStyle(svg).display === "none") return;
    const M = map.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${f1(M.width)} ${f1(M.height)}`);
    let out = "";
    SITE.explore.items.forEach((it, i) => {
      const card = $(`.stop[data-stop="${i}"]`, map);
      if (!card || !it.at) return;
      const C = card.getBoundingClientRect();
      const nx = (it.at[0] / 100) * M.width, ny = (it.at[1] / 100) * M.height;
      const l = C.left - M.left, t = C.top - M.top;
      const px = clamp(nx, l, l + C.width), py = clamp(ny, t, t + C.height);
      const d = Math.hypot(px - nx, py - ny);
      if (d < 16) return;
      const off = (11 * M.width) / MAP_W + 2;
      const sx = nx + ((px - nx) / d) * off, sy = ny + ((py - ny) / d) * off;
      out += `<line x1="${f1(sx)}" y1="${f1(sy)}" x2="${f1(px)}" y2="${f1(py)}"/><rect x="${f1(px - 3)}" y="${f1(py - 3)}" width="6" height="6"/>`;
    });
    svg.innerHTML = out;
  }

  function bindExplore() {
    const map = $(".map");
    const ro = new ResizeObserver(() => drawLeaders());
    ro.observe(map);
    $$(".stop", map).forEach((c) => ro.observe(c));
  }

  /* ======================================================================
     P3 · I INFLUENCE.  文件夹堆：悬停文件夹，顶部黑卡显示这条视频
     ====================================================================== */
  const STAT_KEYS = [
    ["views", "Views"],
    ["likes", "Likes"],
    ["comments", "Comments"],
    ["shares", "Shares"],
    ["saves", "Saves"],
  ];

  function tabSvg(w) {
    const h = 20, s = 16;
    const curve = `M0 ${h} C${s * 0.55} ${h} ${s * 0.45} 0 ${s} 0 L${w - s} 0 C${w - s * 0.45} 0 ${w - s * 0.55} ${h} ${w} ${h}`;
    return `<svg class="folder__tabsvg" width="${w}" height="${h + 2}" viewBox="0 0 ${w} ${h + 2}" aria-hidden="true">
      <path class="tab-fill" d="${curve} L${w} ${h + 2} L0 ${h + 2} Z"/><path class="tab-line" d="${curve}"/></svg>`;
  }

  const fileIndexes = () =>
    SITE.influence.files.map((f, k) => (f.type === "file" ? k : -1)).filter((k) => k >= 0);

  function renderInfluence() {
    const f = SITE.influence;
    const total = fileIndexes().length;
    const cycle = { divider: [0.62, 0.05, 0.68], file: [0.28, 0.66] };
    let dc = 0, fc = 0;

    const folders = f.files.map((x, i) => {
      const isDiv = x.type === "divider";
      const at = x.tabAt ?? (isDiv ? cycle.divider[dc++ % 3] : cycle.file[fc++ % 2]);
      const tw = Math.round(String(x.tab).length * 7 + 60);
      const tab = `
        <span class="folder__tab" style="--at:${at};--tw:${tw}px">
          ${tabSvg(tw)}${ed(`influence.files.${i}.tab`, "span", "folder__label")}
        </span>`;
      return isDiv
        ? `<div class="folder folder--divider" style="--i:${i + 1}">${tab}</div>`
        : `<div class="folder folder--file" style="--i:${i + 1}" role="button" tabindex="0" data-file="${i}" aria-label="${esc(x.tab)}">${tab}</div>`;
    }).join("");

    $("#influence").innerHTML = `
      ${frame()}
      ${head("influence")}
      <div class="drawer">
        <div class="rec" aria-live="polite"></div>
        <div class="folder folder--lead" style="--i:0"></div>
        ${folders}
        <div class="folder folder--front" style="--i:${f.files.length + 1}">
          <span class="folder__front-label">${ed("influence.drawerLabel")} / ${pad(total)} files</span>
        </div>
      </div>`;

    f.files.forEach((x) => measure(x.media));
    currentRec = -1;
    showRecord(fileIndexes()[0]);
  }

  let currentRec = -1;
  function showRecord(i) {
    if (i == null || i === currentRec) return;
    const list = fileIndexes();
    const n = list.indexOf(i);
    if (n < 0) return;
    currentRec = i;
    const p = `influence.files.${i}`;
    const file = SITE.influence.files[i];
    const stats = STAT_KEYS
      .filter(([k]) => file.stats && k in file.stats)
      .map(([k, label]) => `<div><dt>${label}</dt>${ed(`${p}.stats.${k}`, "dd")}</div>`).join("");
    const rec = $(".rec");
    rec.innerHTML = `
      ${slot(`${p}.media`, "Video / screenshot", fitRatio(file.media, "9 / 16"), "rec__media slot--fit", file.tab, true)}
      <div class="rec__main">
        <div class="rec__head"><span>Rec ${pad(n + 1, 3)} / ${pad(list.length, 3)}</span>${ed(`${p}.platform`)}</div>
        <p class="rec__text">${ed(`${p}.text`, "span", "rec__caption")}</p>
        <dl class="rec__stats">${stats}</dl>
        <div class="rec__foot">
          <span>${ed(`${p}.tab`, "b", "rec__tab")}${ed(`${p}.date`, "span", "rec__date")}</span>
          <i class="rec__cursor" aria-hidden="true"></i>
        </div>
      </div>`;
    $$(".folder--file").forEach((el) => el.classList.toggle("is-active", Number(el.dataset.file) === i));
    applyEditable(rec);
  }

  /* ======================================================================
     P4 · I CREATE.  可旋转线框球
     图片贴在球面上（每张切成 7 条竖片，拼出弧面），线框用 SVG 按同一套
     透视算出来叠在上面。拖动旋转，点击图片在右侧看详情。
     ====================================================================== */
  const STRIPS = 7;
  const globe = {
    yaw: -20, pitch: -12, vy: 0, vp: 0, R: 240, D: 1600, size: 0,
    sel: 0, target: null, hover: false, drag: null, idleUntil: 0,
    visible: false, raf: 0, slots: [], dims: [], urls: [], wires: [], shade: [],
  };

  // 球面上的位置：8 件 = 上下两圈各 4 个，交错排列
  // base = 默认面板大小（经度跨度, 纬度跨度）；图片加载后由 fitSlots() 按图片比例改形状
  function globeSlots(n) {
    const rows = n <= 5 ? [n] : n <= 10 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [Math.ceil(n / 3), Math.ceil(n / 3), n - 2 * Math.ceil(n / 3)];
    const lats = rows.length === 1 ? [0] : rows.length === 2 ? [28, -28] : [40, 0, -40];
    const dLat = rows.length === 3 ? 30 : 42;
    const ringsOut = rows.map((count, ri) => {
      const step = 360 / count;
      const dLon = Math.min(66, step * 0.74);
      return Array.from({ length: count }, (_, k) => ({
        lon: k * step + (ri % 2) * (step / 2), lat: lats[ri], dLon, dLat,
        base: [dLon, dLat], maxLon: Math.min(100, step - 10),
      }));
    });
    const out = [];
    for (let k = 0; out.length < n; k++) ringsOut.forEach((r) => { if (r[k]) out.push(r[k]); });
    return out;
  }

  // 面板形状跟着图片比例走，面积和默认面板差不多（图片不再被裁成同一个比例）。
  // 太高的图整体缩小；上下两圈的面板互相压住时，两张一起缩小到不重叠。
  const MAX_LAT = 60;
  // 给定纬度跨度 t，求面板宽高比正好等于 r 的经度跨度（和 layoutPanel 用同一套几何，R 取 1）
  function lonFor(sl, t, r) {
    const h = 2 * Math.sin((t / 2) * RAD);
    const rho = Math.cos(sl.lat * RAD) + (h / 2) * Math.sin(Math.abs(sl.lat) * RAD);
    return (2 * STRIPS * Math.atan((r * h) / (2 * rho * STRIPS))) / RAD;
  }
  function fitSlots() {
    const S = globe.slots;
    S.forEach((sl, i) => {
      const [l0, t0] = sl.base;
      const d = globe.dims[i];
      sl.r = d ? d[0] / d[1] : 0;
      if (!sl.r) { sl.dLon = l0; sl.dLat = t0; return; }
      const c = Math.cos(sl.lat * RAD) + Math.sin(Math.abs(sl.lat) * RAD) * 0.36;
      let t = Math.min(MAX_LAT, Math.sqrt((l0 * t0 * c) / sl.r));
      let lon = lonFor(sl, t, sl.r);
      while (lon > sl.maxLon) { t *= 0.97; lon = lonFor(sl, t, sl.r); }
      sl.dLon = lon; sl.dLat = t;
    });
    const shrink = (x) => {
      x.dLat *= 0.97;
      x.dLon = x.r ? lonFor(x, x.dLat, x.r) : x.dLon * 0.97;
    };
    for (let pass = 0; pass < 40; pass++) {
      let hit = false;
      for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
        const a = S[i], b = S[j];
        let dl = Math.abs(a.lon - b.lon) % 360;
        dl = Math.min(dl, 360 - dl);
        if ((a.dLon + b.dLon) / 2 + 3 > dl && (a.dLat + b.dLat) / 2 + 3 > Math.abs(a.lat - b.lat)) {
          shrink(a); shrink(b);
          hit = true;
        }
      }
      if (!hit) break;
    }
  }

  const relayoutGlobe = () => { fitSlots(); SITE.create.items.forEach((_, k) => layoutPanel(k)); };

  // 线框：6 条经线、5 条纬线、3 条斜大圆（单位球上的点，渲染时再旋转投影）
  function globeWires() {
    const circle = (fn) => Array.from({ length: 73 }, (_, k) => fn(k * 5 * RAD));
    const out = [];
    for (let m = 0; m < 6; m++) {
      const lon = m * 30 * RAD;
      out.push(circle((t) => [Math.cos(t) * Math.sin(lon), -Math.sin(t), Math.cos(t) * Math.cos(lon)]));
    }
    [-60, -30, 0, 30, 60].forEach((lat) => {
      const c = Math.cos(lat * RAD), s = Math.sin(lat * RAD);
      out.push(circle((t) => [c * Math.sin(t), -s, c * Math.cos(t)]));
    });
    [[0.62, 0.28], [-0.4, 1.1], [1.2, -0.55]].forEach(([a, b]) => {
      const u = [Math.cos(a), Math.sin(a) * Math.sin(b), Math.sin(a) * Math.cos(b)];
      const w = [-Math.sin(a) * Math.sin(b), Math.cos(b), 0];
      const wl = Math.hypot(...w);
      const v0 = w.map((x) => x / wl);
      const v = [u[1] * v0[2] - u[2] * v0[1], u[2] * v0[0] - u[0] * v0[2], u[0] * v0[1] - u[1] * v0[0]];
      out.push(circle((t) => u.map((x, i) => Math.cos(t) * x + Math.sin(t) * v[i])));
    });
    return out;
  }

  function renderCreate() {
    const c = SITE.create;
    globe.slots = globeSlots(c.items.length);
    globe.wires = globeWires();
    globe.sel = clamp(globe.sel, 0, c.items.length - 1);
    const panels = c.items.map((it, i) => {
      const strips = Array.from({ length: STRIPS }, (_, s) =>
        `<i class="gp__s${s === 0 ? " gp__s--l" : ""}${s === STRIPS - 1 ? " gp__s--r" : ""}"></i>`).join("");
      return `<div class="gp${it.image ? "" : " gp--empty"}" data-gp="${i}">${strips}<span class="gp__tag">${pad(i + 1)}</span></div>`;
    }).join("");

    $("#create").innerHTML = `
      ${head("create")}
      <div class="atlas">
        <div class="globe" role="group" aria-label="Rotating globe of projects">
          <div class="globe__rot">${panels}</div>
          <svg class="globe__wire" aria-hidden="true"><path class="w-back"/><path class="w-front"/><circle class="w-sil"/></svg>
          ${ed("create.hint", "p", "globe__hint")}
        </div>
        <aside class="vault" aria-live="polite"></aside>
      </div>`;
    c.items.forEach((_, i) => loadPanelImage(i));
    showWork(globe.sel, false);
  }

  function loadPanelImage(i) {
    const src = globe.urls[i] || SITE.create.items[i]?.image;
    const gp = $(`.gp[data-gp="${i}"]`);
    if (!gp) return;
    gp.classList.toggle("gp--empty", !src);
    globe.dims[i] = null;
    if (src) {
      const im = new Image();
      im.onload = () => {
        globe.dims[i] = [im.naturalWidth, im.naturalHeight];
        natural[src] = `${im.naturalWidth} / ${im.naturalHeight}`;
        relayoutGlobe();
      };
      im.onerror = () => { gp.classList.add("gp--empty"); relayoutGlobe(); };
      im.src = src;
    }
    layoutPanel(i);
  }

  // 一张图 = 7 条竖片，每片贴在球面上自己的经度；背景图按整张面板 cover 后切片
  function layoutPanel(i) {
    const gp = $(`.gp[data-gp="${i}"]`);
    const sl = globe.slots[i];
    if (!gp || !sl) return;
    const R = globe.R;
    const h = 2 * R * Math.sin((sl.dLat / 2) * RAD);
    const dl = sl.dLon / STRIPS;
    const rho = R * Math.cos(sl.lat * RAD) + (h / 2) * Math.sin(Math.abs(sl.lat) * RAD);
    const w = 2 * rho * Math.tan((dl / 2) * RAD) + 0.6;
    const PW = w * STRIPS, PH = h;
    const src = globe.urls[i] || SITE.create.items[i]?.image;
    let bw = PW, bh = PH, ox = 0, oy = 0;
    if (src && globe.dims[i]) {
      const [iw, ih] = globe.dims[i];
      const s = Math.max(PW / iw, PH / ih);
      bw = iw * s; bh = ih * s; ox = (PW - bw) / 2; oy = (PH - bh) / 2;
    }
    $$(".gp__s", gp).forEach((s, k) => {
      const lon = sl.lon - sl.dLon / 2 + (k + 0.5) * dl;
      s.style.cssText = `width:${f1(w)}px;height:${f1(h)}px;margin:${f1(-h / 2)}px 0 0 ${f1(-w / 2)}px;` +
        `transform:rotateY(${f1(lon)}deg) rotateX(${sl.lat}deg) translateZ(${f1(R)}px);` +
        (src ? `background-image:${cssUrl(src)};background-size:${f1(bw)}px ${f1(bh)}px;background-position:${f1(ox - k * w)}px ${f1(oy)}px;` : "");
    });
    $(".gp__tag", gp).style.transform = `rotateY(${sl.lon}deg) rotateX(${sl.lat}deg) translateZ(${f1(R + 10)}px) translate(-50%, -50%)`;
  }

  function sizeGlobe() {
    const stage = $(".globe");
    const size = stage.clientWidth;
    if (!size || size === globe.size) return;
    globe.size = size;
    globe.R = size * 0.39;
    globe.D = size * 2.6;
    stage.style.perspective = `${f1(globe.D)}px`;
    SITE.create.items.forEach((_, i) => layoutPanel(i));
    drawGlobe();
  }

  // 旋转（与 CSS 的 rotateX(pitch) rotateY(yaw) 完全一致）+ 透视投影
  function globeProjector() {
    const cy = Math.cos(globe.yaw * RAD), sy = Math.sin(globe.yaw * RAD);
    const cp = Math.cos(globe.pitch * RAD), sp = Math.sin(globe.pitch * RAD);
    const half = globe.size / 2, D = globe.D;
    return (p, r) => {
      const x = p[0] * r, y = p[1] * r, z = p[2] * r;
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const k = D / (D - z2);
      return [half + x1 * k, half + y2 * k, z2];
    };
  }

  function drawGlobe() {
    const stage = $(".globe");
    if (!stage || !globe.size) return;
    $(".globe__rot", stage).style.transform = `rotateX(${globe.pitch.toFixed(2)}deg) rotateY(${globe.yaw.toFixed(2)}deg)`;
    const proj = globeProjector();
    const R = globe.R;

    // 线框：正面实线，背面淡线
    let front = "", back = "";
    globe.wires.forEach((pts) => {
      let prev = null;
      pts.forEach((p) => {
        const q = proj(p, R * 1.015);
        const isFront = q[2] > 0;
        const cmd = `${f1(q[0])} ${f1(q[1])}`;
        if (prev && prev.front === isFront) {
          if (isFront) front += `L${cmd}`; else back += `L${cmd}`;
        } else if (isFront) front += `M${cmd}`; else back += `M${cmd}`;
        prev = { front: isFront };
      });
    });
    $(".w-front", stage).setAttribute("d", front);
    $(".w-back", stage).setAttribute("d", back);
    const sil = $(".w-sil", stage);
    sil.setAttribute("cx", f1(globe.size / 2));
    sil.setAttribute("cy", f1(globe.size / 2));
    sil.setAttribute("r", f1((R * 1.015 * globe.D) / Math.sqrt(globe.D ** 2 - (R * 1.015) ** 2)));

    // 背面的图片压暗
    globe.slots.forEach((sl, i) => {
      const n = [Math.cos(sl.lat * RAD) * Math.sin(sl.lon * RAD), -Math.sin(sl.lat * RAD), Math.cos(sl.lat * RAD) * Math.cos(sl.lon * RAD)];
      const facing = proj(n, 1)[2];
      const shade = facing >= 0 ? (1 - facing) * 0.3 : 0.5 + -facing * 0.3;
      if (Math.abs((globe.shade[i] ?? -1) - shade) > 0.01) {
        globe.shade[i] = shade;
        $(`.gp[data-gp="${i}"]`, stage)?.style.setProperty("--shade", shade.toFixed(3));
      }
    });
  }

  function tickGlobe() {
    globe.raf = 0;
    if (!globe.visible || document.hidden) return;
    const now = performance.now();
    if (globe.target) {
      globe.yaw += (globe.target.yaw - globe.yaw) * 0.1;
      globe.pitch += (globe.target.pitch - globe.pitch) * 0.1;
      if (Math.abs(globe.target.yaw - globe.yaw) < 0.05 && Math.abs(globe.target.pitch - globe.pitch) < 0.05) globe.target = null;
    } else if (!globe.drag) {
      if (Math.abs(globe.vy) + Math.abs(globe.vp) > 0.02) {
        globe.yaw += globe.vy;
        globe.pitch = clamp(globe.pitch + globe.vp, -60, 60);
        globe.vy *= 0.93; globe.vp *= 0.93;
      } else if (!reduceMotion && !globe.hover && now > globe.idleUntil) {
        globe.yaw += 0.08;
      }
    }
    drawGlobe();
    globe.raf = requestAnimationFrame(tickGlobe);
  }

  const startGlobe = () => { if (!globe.raf && globe.visible) globe.raf = requestAnimationFrame(tickGlobe); };

  function showWork(i, rotate = true) {
    const items = SITE.create.items;
    const n = items.length;
    i = ((i % n) + n) % n;
    globe.sel = i;
    $$(".gp").forEach((g) => g.classList.toggle("is-sel", Number(g.dataset.gp) === i));
    const p = `create.items.${i}`;
    const it = items[i];
    const link = it.link
      ? `<a class="chip chip--solid" href="${esc(it.link)}" target="_blank" rel="noopener">Open ↗</a>`
      : `<span class="chip chip--muted vault__pending">Link pending</span>`;
    const vault = $(".vault");
    vault.innerHTML = `
      <div class="vault__bar">${ed(`${p}.kind`, "span", "vault__kind")}<span>${pad(i + 1)} / ${pad(n)}</span></div>
      ${slot(`${p}.image`, "Project image", fitRatio(it.image, "4 / 3"), "vault__media slot--fit", it.title)}
      <div class="vault__body">
        ${ed(`${p}.title`, "h3", "vault__title")}
        ${ed(`${p}.outlet`, "p", "vault__outlet")}
        ${ed(`${p}.abstract`, "p", "vault__abstract")}
      </div>
      <div class="vault__actions">
        ${link}
        <span class="vault__nav">
          <button class="chip" type="button" data-step="-1" aria-label="Previous project">Prev</button>
          <button class="chip" type="button" data-step="1" aria-label="Next project">Next</button>
        </span>
      </div>`;
    applyEditable(vault);
    if (!rotate) return;
    const sl = globe.slots[i];
    let yaw = -sl.lon;
    yaw += 360 * Math.round((globe.yaw - yaw) / 360);
    const target = { yaw, pitch: -sl.lat * 0.8 };
    globe.vy = globe.vp = 0;
    globe.idleUntil = performance.now() + 9000;
    if (reduceMotion) { globe.yaw = target.yaw; globe.pitch = target.pitch; drawGlobe(); }
    else { globe.target = target; startGlobe(); }
  }

  function bindCreate() {
    const stage = $(".globe");
    sizeGlobe();
    new ResizeObserver(() => sizeGlobe()).observe(stage);
    new IntersectionObserver(([en]) => {
      globe.visible = en.isIntersecting;
      if (globe.visible) startGlobe();
    }).observe($("#create"));
    document.addEventListener("visibilitychange", startGlobe);

    stage.addEventListener("pointerenter", () => { globe.hover = true; });
    stage.addEventListener("pointerleave", () => { globe.hover = false; });
    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("[data-edit]")) return;
      globe.drag = { lx: e.clientX, ly: e.clientY, moved: 0, gp: e.target.closest(".gp") };
      globe.target = null;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      const d = globe.drag;
      if (!d) return;
      const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
      d.lx = e.clientX; d.ly = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
      globe.vy = dx * 0.35; globe.vp = -dy * 0.35;
      globe.yaw += globe.vy;
      globe.pitch = clamp(globe.pitch + globe.vp, -60, 60);
      drawGlobe();
    });
    const end = () => {
      const d = globe.drag;
      if (!d) return;
      globe.drag = null;
      globe.idleUntil = performance.now() + 4000;
      if (d.moved < 6) { globe.vy = globe.vp = 0; if (d.gp) showWork(Number(d.gp.dataset.gp)); }
      startGlobe();
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);

    $(".vault").addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (b) showWork(globe.sel + Number(b.dataset.step));
    });
  }

  /* ======================================================================
     P5 · I CLIMB.  几何攀岩墙：有 media 的岩点悬停放大成图片 / 视频
     ====================================================================== */
  const SHAPES = {
    tri: `<path class="s" d="M50 14 L88 84 L12 84 Z" stroke-width="12" stroke-linejoin="round"/>`,
    disc: `<circle class="s" cx="50" cy="50" r="40"/>`,
    half: `<path class="s" d="M8 66 A42 42 0 0 1 92 66 Z" stroke-width="6" stroke-linejoin="round"/>`,
    pill: `<rect class="s" x="8" y="33" width="84" height="34" rx="17"/>`,
    hex: `<path class="s" d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" stroke-width="8" stroke-linejoin="round"/>`,
    crescent: `<path class="s" d="M71.9 16.5 A40 40 0 1 0 71.9 83.5 A34 34 0 1 1 71.9 16.5 Z"/>`,
    square: `<rect class="s" x="16" y="16" width="68" height="68" rx="10"/>`,
    drop: `<path class="s" d="M50 8 C58 22 84 46 84 62 A34 34 0 0 1 16 62 C16 46 42 22 50 8 Z"/>`,
  };

  function renderClimb() {
    const c = SITE.climb;
    const route = c.holds.filter((h) => h.route);
    let k = 0;

    const holds = c.holds.map((h, i) => {
      const p = `climb.holds.${i}`;
      const style = `--x:${h.x}%;--y:${h.y}%;--s:${h.s};--c:${h.color}`;
      const shape = `
        <svg class="hold__shape" viewBox="0 0 100 100" aria-hidden="true">
          <g transform="rotate(${h.rot || 0} 50 50)">${SHAPES[h.shape] || SHAPES.disc}</g>
          <circle class="hold__bolt" cx="50" cy="50" r="7"/><circle class="hold__bolt-in" cx="50" cy="50" r="2.4"/>
        </svg>`;
      if (!h.media) return `<span class="hold" style="${style}">${shape}</span>`;
      k += 1;
      return `
        <div class="hold hold--live" style="${style}" role="button" tabindex="0" aria-label="Climb ${k}">
          ${shape}
          <figure class="hold__media">
            ${slot(`${p}.media.src`, "Climb photo / video", "4 / 5", "", h.media.caption)}
            ${ed(`${p}.media.caption`, "figcaption")}
          </figure>
        </div>`;
    }).join("");

    const points = route.map((h) => `${h.x},${(h.y * 0.5625).toFixed(2)}`).join(" ");
    const first = route[0], last = route[route.length - 1];
    const marks = route.length
      ? `<span class="wall__mark chip chip--sm" style="--x:${first.x}%;--y:${first.y}%;--dy:calc(${first.s} * 0.5 * var(--hs) + 18px)">Start</span>
         <span class="wall__mark chip chip--sm" style="--x:${last.x}%;--y:${last.y}%;--dy:calc(${last.s} * -0.5 * var(--hs) - 18px)">Top</span>`
      : "";

    $("#climb").innerHTML = `
      ${head("climb")}
      <div class="wall">
        <svg class="wall__route" viewBox="0 0 100 56.25" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${points}"/>
        </svg>
        ${marks}
        ${holds}
        <div class="wall__plate">${c.stats.map((s, i) => ed(`climb.stats.${i}`, "span", "chip chip--sm")).join("")}</div>
      </div>`;
  }

  /* ======================================================================
     P6 · I VIBE.  三栏撕纸拼贴：健身 / 穿搭 / 生活，原图彩色
     位置单位是“栏宽的百分比”（cqw），照片高度按 4:5 自动算
     ====================================================================== */
  // 撕纸边缘：返回 clip-path polygon。inset > 0 时往里收，露出白色纸边
  function torn(edges, seed, inset = 0) {
    const r = rng(seed * 9973 + 17);
    const f = rng(seed * 7919 + 3);
    const amp = 1.5, a = 1.2, b = 3.2;
    const depth = () => r() * amp + (inset ? inset + f() * 0.8 : 0);
    const step = () => a + r() * (b - a);
    const has = (e) => edges.includes(e);
    const pts = [];
    if (has("top")) { for (let x = 0; x < 100; x += step()) pts.push([x, depth()]); pts.push([100, depth()]); }
    else pts.push([0, 0], [100, 0]);
    if (has("right")) { for (let y = 0; y < 100; y += step()) pts.push([100 - depth(), y]); pts.push([100 - depth(), 100]); }
    else pts.push([100, 100]);
    if (has("bottom")) { for (let x = 100; x > 0; x -= step()) pts.push([x, 100 - depth()]); pts.push([0, 100 - depth()]); }
    else pts.push([0, 100]);
    if (has("left")) { for (let y = 100; y > 0; y -= step()) pts.push([depth(), y]); }
    return pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(",");
  }

  const ratioOf = (ar) => {
    const [a, b] = String(ar || "4 / 5").split("/").map(Number);
    return a > 0 && b > 0 ? a / b : 0.8;
  };

  function renderVibe() {
    const cols = SITE.vibe.columns.map((col, ci) => {
      let photoNo = 0, bottom = 0;
      const pieces = col.pieces.map((pc, pi) => {
        const p = `vibe.columns.${ci}.pieces.${pi}`;
        const seed = ci * 17 + pi + 1;
        const h = pc.kind === "photo" ? pc.w / ratioOf(pc.ar) : pc.h;
        bottom = Math.max(bottom, pc.y + h);
        let body = "";
        if (pc.kind === "photo") {
          photoNo += 1;
          const label = `${col.label} ${pad(photoNo)}`;
          // 空照片位用半调渐变占位，读起来像一张印刷照片
          body = pc.image
            ? slot(`${p}.image`, label, null, "", `${col.label} photo ${photoNo}`)
            : `<div class="slot slot--empty slot--screen" data-img="${p}.image">${halftoneTile(seed * 13 + photoNo, 4.2)}<span class="slot__label">${esc(label)} / 4:5</span></div>`;
        } else if (pc.kind === "graph") body = graphSvg(seed);
        else if (pc.kind === "halftone") body = halftoneTile(seed * 3);
        return `
          <div class="piece piece--${pc.kind}" style="--x:${pc.x}cqw;--y:${pc.y}cqw;--w:${pc.w}cqw;--h:${f1(h)}cqw;--rot:${pc.rot || 0}deg;clip-path:polygon(${torn(pc.torn || [], seed)})">
            <div class="piece__in" style="clip-path:polygon(${torn(pc.torn || [], seed, 0.9)})">${body}</div>
          </div>`;
      }).join("");
      return `
        <div class="vibe__col">
          <header class="vibe__head">
            ${ed(`vibe.columns.${ci}.label`, "h3", "vibe__name")}
            <span class="vibe__count">${pad(photoNo)} images</span>
          </header>
          <div class="vibe__board" style="height:${f1(bottom + 2)}cqw">${pieces}</div>
        </div>`;
    }).join("");

    $("#vibe").innerHTML = `${head("vibe")}<div class="vibe">${cols}</div>`;
  }

  /* ======================================================================
     P7 · CONTACT  结束页：黑色铭牌 + 小号半调球体 + 小图标
     ====================================================================== */
  function contactArt() {
    return `<svg class="contact__svg stamp" viewBox="0 0 640 300" aria-hidden="true">
      <g class="art-ink">${halftoneSphere(130, 150, 118, 8, 0.68)}</g>
      ${discStack(300, 36, 34)}
      ${rings(392, 36, 17, "contactRings")}
      ${dots3(492, 53, 3.5, 12)}
      ${truss(300, 108, 30, 10)}
      ${ellipseRow(316, 222, 9, 35, 30, 13)}
    </svg>`;
  }

  function renderContact() {
    const c = SITE.contact;
    const rows = c.rows.map((r, i) => {
      const p = `contact.rows.${i}`;
      let value;
      if (r.value && r.href) {
        const ext = /^https?:/.test(r.href) ? ` target="_blank" rel="noopener"` : "";
        value = `<a href="${esc(r.href)}"${ext} data-edit="${p}.value">${esc(r.value)}</a>`;
      } else {
        value = ed(`${p}.value`, "span", "is-pending");
      }
      return `<div class="plate__row"><dt>${ed(`${p}.label`)}</dt><dd>${value}</dd></div>`;
    }).join("");

    $("#contact").innerHTML = `
      ${frame()}
      ${head("contact")}
      <div class="plate">
        <div class="plate__top">
          <span class="plate__name">${esc(SITE.meta.name)}</span>
          <span class="plate__year">${esc(SITE.meta.year)}</span>
        </div>
        <div class="plate__stripes" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <dl class="plate__rows">${rows}</dl>
        <div class="plate__foot">${ed("contact.plateFooterLeft")}${ed("contact.plateFooterRight")}</div>
      </div>
      <div class="contact__art">${contactArt()}</div>
      <footer class="foot">
        <span>© ${esc(SITE.meta.year)} ${esc(SITE.meta.name)}</span>
        <a class="chip" href="#hero">Back to top ↑</a>
      </footer>`;
  }

  /* ======================================================================
     INTERACTIONS
     ====================================================================== */
  function bindNav() {
    const nav = $("#nav");
    const menu = $(".nav__menu", nav);
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    $$(".nav__links a", nav).forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
    $(".nav__edit", nav)?.addEventListener("click", () => setEditing(!editing));

    const links = $$(".nav__links a", nav);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => {
          if (a.dataset.target === en.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$(".page").forEach((s) => io.observe(s));
  }

  function bindInfluence() {
    const drawer = $(".drawer");
    const pick = (el) => el && showRecord(Number(el.dataset.file));
    drawer.addEventListener("mouseover", (e) => { if (!editing) pick(e.target.closest(".folder--file")); });
    drawer.addEventListener("focusin", (e) => pick(e.target.closest(".folder--file")));
    drawer.addEventListener("click", (e) => pick(e.target.closest(".folder--file")));
  }

  function bindClimb() {
    const wall = $(".wall");
    // 让放大的媒体框始终留在墙内，并开始播放视频
    const fit = (hold) => {
      if (!hold) return;
      const media = $(".hold__media", hold);
      media.style.setProperty("--mx", "0px");
      media.style.setProperty("--my", "0px");
      const w = wall.getBoundingClientRect(), m = media.getBoundingClientRect(), g = 10;
      let dx = 0, dy = 0;
      if (m.left < w.left + g) dx = w.left + g - m.left;
      if (m.right > w.right - g) dx = w.right - g - m.right;
      if (m.top < w.top + g) dy = w.top + g - m.top;
      if (m.bottom > w.bottom - g) dy = w.bottom - g - m.bottom;
      media.style.setProperty("--mx", `${dx}px`);
      media.style.setProperty("--my", `${dy}px`);
      $("video", media)?.play().catch(() => {});
    };
    const stop = (hold) => { if (hold && !hold.classList.contains("is-open")) $("video", hold)?.pause(); };
    wall.addEventListener("mouseover", (e) => {
      const h = e.target.closest(".hold--live");
      if (h && !h.contains(e.relatedTarget)) fit(h);
    });
    wall.addEventListener("mouseout", (e) => {
      const h = e.target.closest(".hold--live");
      if (h && !h.contains(e.relatedTarget)) stop(h);
    });
    wall.addEventListener("focusin", (e) => fit(e.target.closest(".hold--live")));
    wall.addEventListener("focusout", (e) => stop(e.target.closest(".hold--live")));
    wall.addEventListener("click", (e) => {
      if (editing) return;
      const h = e.target.closest(".hold--live");
      $$(".hold--live.is-open", wall).forEach((o) => { if (o !== h) { o.classList.remove("is-open"); stop(o); } });
      if (h) { h.classList.toggle("is-open"); fit(h); }
    });
  }

  /* ======================================================================
     EDIT MODE
     文字改动和换图都先存在浏览器 localStorage，刷新不丢；
     点「导出 content.js」下载新文件，覆盖 assets/js/content.js 才算真正写入。
     ====================================================================== */
  const overrides = (() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  })();
  Object.entries(overrides).forEach(([p, v]) => setPath(SITE, p, v));

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(overrides)); } catch { /* 隐私模式下忽略 */ }
    updateEditbar();
  }

  function applyEditable(root = document) {
    $$("[data-edit]", root).forEach((el) => {
      if (!editing) { el.removeAttribute("contenteditable"); return; }
      try { el.contentEditable = "plaintext-only"; } catch { el.contentEditable = "true"; }
      el.spellcheck = false;
    });
  }

  function updateEditbar() {
    const n = Object.keys(overrides).length;
    const media = Object.values(overrides).filter((v) => /^assets\/img\//.test(v)).length;
    $("#editbar .editbar__count").textContent = n
      ? `本地修改 ${n} 处，未写入文件${media ? `；新换的 ${media} 个图片 / 视频要复制进 assets/img/` : ""}`
      : "暂无本地修改";
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("is-editing", on);
    $(".nav__edit")?.setAttribute("aria-pressed", String(on));
    $("#editbar").hidden = !on;
    applyEditable();
    updateEditbar();
  }

  function exportContent() {
    const date = new Date().toISOString().slice(0, 10);
    const text = `/* content.js · 编辑模式导出 ${date}\n   覆盖 assets/js/content.js 即可。注释不会保留，字段说明见 README.md */\n\nwindow.SITE = ${JSON.stringify(SITE, null, 2)};\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    a.download = "content.js";
    document.body.append(a);
    a.click();
    a.remove();
  }

  // 换图后需要额外刷新的地方（球面上的图片不是 <img>，要单独更新）
  function onMediaChange(path, url) {
    const m = path.match(/^create\.items\.(\d+)\.image$/);
    if (m) { globe.urls[Number(m[1])] = url; loadPanelImage(Number(m[1])); }
  }

  function bindEdit() {
    document.addEventListener("input", (e) => {
      if (!editing) return;
      const el = e.target.closest?.("[data-edit]");
      if (!el) return;
      const path = el.dataset.edit;
      const value = el.innerText.replace(/\n+$/, "");
      if (!setPath(SITE, path, value)) return;
      overrides[path] = value;
      persist();
      $$(`[data-edit="${path}"]`).forEach((o) => { if (o !== el) o.textContent = value; });
    });

    document.addEventListener("keydown", (e) => {
      const inField = e.target.closest?.("[contenteditable], input, textarea");
      if (editing && e.key === "Enter" && !e.shiftKey && e.target.closest?.("[data-edit]")) { e.preventDefault(); e.target.blur(); }
      if (e.key === "E" && e.shiftKey && !inField) setEditing(!editing);
    });

    document.addEventListener("paste", (e) => {
      if (!editing || !e.target.closest?.("[data-edit]")) return;
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    });

    // 换图：编辑模式下点任意图片框
    const picker = Object.assign(document.createElement("input"), { type: "file", accept: "image/*,video/*", hidden: true });
    document.body.append(picker);
    let target = null;
    document.addEventListener("click", (e) => {
      if (!editing) return;
      const box = e.target.closest("[data-img]");
      if (box) {
        e.preventDefault();
        e.stopPropagation();
        target = box;
        picker.value = "";
        picker.click();
        return;
      }
      if (e.target.closest("[data-edit]") && e.target.closest("a")) e.preventDefault();
    }, true);

    picker.addEventListener("change", () => {
      const file = picker.files[0];
      if (!file || !target) return;
      const path = target.dataset.img;
      const value = `assets/img/${file.name}`;
      if (!setPath(SITE, path, value)) return;
      overrides[path] = value;
      persist();
      const url = URL.createObjectURL(file);
      target.classList.remove("slot--empty", "slot--screen");
      if (target.classList.contains("slot--fit")) target.style.aspectRatio = "";
      target.innerHTML = file.type.startsWith("video/")
        ? `<video src="${url}" muted loop playsinline autoplay></video>`
        : `<img src="${url}" alt="">`;
      onMediaChange(path, url);
    });

    $("#editbar").addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "export") exportContent();
      if (act === "done") setEditing(false);
      if (act === "reset" && confirm("清除所有本地修改？content.js 文件不受影响。")) {
        try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
        location.reload();
      }
    });
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  // 图片 / 视频文件找不到时显示占位框，写明缺哪个文件（不会变成一块白板）
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement) || el.src.startsWith("blob:")) return;
    const box = el.closest(".slot");
    if (!box) return;
    box.classList.add("slot--empty");
    box.innerHTML = `<span class="slot__label">File not found<br>${esc(el.getAttribute("src"))}</span>`;
  }, true);

  renderNav();
  renderHero();
  renderExplore();
  renderInfluence();
  renderCreate();
  renderClimb();
  renderVibe();
  renderContact();

  bindNav();
  bindExplore();
  bindInfluence();
  bindCreate();
  bindClimb();
  bindEdit();
  updateEditbar();
})();
