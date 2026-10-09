/* HELIOS — scroll-driven solar system voyage.
 * Milky Way → stellar neighborhood → Oort Cloud → Sun → planets → Kuiper Belt
 * → Voyagers. Same interpolation engine as SCROLLFILM: the scroll position is
 * a playhead (0 → 1); the render loop eases toward it every frame, so ~20 Hz
 * scroll input still renders buttery motion at display rate.
 */
import * as THREE from 'three';

const canvas = document.getElementById('film');
const hudBar = document.getElementById('hudBar');
const hudKnob = document.getElementById('hudKnob');
const hudFps = document.getElementById('hudFps');
const hudStop = document.getElementById('hudStop');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = matchMedia('(pointer: coarse)').matches;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const env = (p, a, b, c, d) => sstep(a, b, p) * (1 - sstep(c, d, p));
const lerp = (a, b, t) => a + (b - a) * t;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no-webgl');
  document.getElementById('nogl').hidden = false;
  document.querySelectorAll('.chapter').forEach((el) => el.classList.add('is-active'));
  throw e;
}

const PR_CAP = isCoarse ? 1.5 : 2;
let pixelRatio = Math.min(devicePixelRatio || 1, PR_CAP);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);
scene.fog = new THREE.Fog(0x04060d, 420, 1700);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 4000);

/* ---------------- procedural textures ---------------- */
function canvasTex(w, h, painter) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  painter(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);

const glowTex = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

function bandsTexture(colors) {
  return canvasTex(256, 128, (g, w, h) => {
    const n = colors.length * 2;
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[i % colors.length];
      const y0 = (i / n) * h;
      g.beginPath();
      g.moveTo(0, y0);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.05 + i * 2.1) * 4 + rnd(-2, 2));
      g.lineTo(w, y0 + h / n + 8); g.lineTo(0, y0 + h / n + 8);
      g.closePath(); g.fill();
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${rnd(0.02, 0.09)})`;
      g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 3), rnd(1, 2));
    }
  });
}
function rockyTexture(base, dark, light) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = Math.random() < 0.5 ? dark : light;
      g.globalAlpha = rnd(0.08, 0.3);
      const r = rnd(0.6, 3.2);
      g.beginPath(); g.arc(rnd(0, w), rnd(0, h), r, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 26; i++) {
      const x = rnd(0, w), y = rnd(0, h), r = rnd(3, 10);
      g.fillStyle = dark; g.globalAlpha = 0.35;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = light; g.globalAlpha = 0.25;
      g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.7, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  });
}
const earthTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#1b5faa'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = ['#3d7a3a', '#6b8f3d', '#8a7a4a'][i % 3];
    g.globalAlpha = 0.9;
    g.beginPath();
    g.ellipse(rnd(0, w), rnd(h * 0.15, h * 0.85), rnd(8, 30), rnd(5, 16), rnd(0, 3), 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = '#eaf4ff';
  g.fillRect(0, 0, w, 9); g.fillRect(0, h - 10, w, 10);
  for (let i = 0; i < 40; i++) {
    g.globalAlpha = rnd(0.25, 0.6);
    g.fillRect(rnd(0, w), rnd(0, h), rnd(12, 42), rnd(1.5, 3.5));
  }
  g.globalAlpha = 1;
});
const sunTex = canvasTex(256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#ffdf80'); gr.addColorStop(0.5, '#ffb13d'); gr.addColorStop(1, '#ff7b1c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#ffedbe' : '#e06a00';
    g.globalAlpha = rnd(0.1, 0.35);
    g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(0.8, 2.6), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
});
const saturnRingTex = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  for (let r = 58; r < 126; r += 2) {
    const a = 0.25 + 0.65 * Math.abs(Math.sin(r * 0.35)) * (r > 100 ? 0.5 : 1);
    g.strokeStyle = `rgba(${210 + rnd(-20, 20)},${190 + rnd(-20, 10)},${150 + rnd(-20, 10)},${a.toFixed(2)})`;
    g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  }
});

/* ---------------- starfield backdrop ---------------- */
{
  const N = isCoarse ? 700 : 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = rnd(900, 1800);
    const th = rnd(0, Math.PI * 2), ph = Math.acos(rnd(-1, 1));
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd0ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.75 })));
}

/* ---------------- the Milky Way ---------------- */
const galaxyGroup = new THREE.Group();
{
  const N = isCoarse ? 2600 : 5200;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const cCore = new THREE.Color(0xffd9a0), cEdge = new THREE.Color(0x6f9fff), cc = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const arm = i % 3;
    const r = 18 + Math.pow(Math.random(), 0.65) * 300;
    const a = arm * (Math.PI * 2 / 3) + r * 0.011 + rnd(-0.35, 0.35);
    pos[i * 3] = Math.cos(a) * r + rnd(-9, 9);
    pos[i * 3 + 1] = rnd(-1, 1) * 16 * (1 - r / 420) + rnd(-4, 4);
    pos[i * 3 + 2] = Math.sin(a) * r + rnd(-9, 9);
    cc.copy(cCore).lerp(cEdge, clamp01(r / 320));
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  galaxyGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.4, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe2b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(150, 150, 1);
  galaxyGroup.add(core);
}
galaxyGroup.rotation.x = 0.5;
scene.add(galaxyGroup);

/* "you are here" marker */
const markerGroup = new THREE.Group();
const markerRing = new THREE.Mesh(
  new THREE.TorusGeometry(7, 0.35, 8, 48),
  new THREE.MeshBasicMaterial({ color: 0xffb454, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
);
const markerGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb454, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
markerGlow.scale.set(26, 26, 1);
markerGroup.add(markerRing, markerGlow);
scene.add(markerGroup);

/* ---------------- neighbouring stars ---------------- */
const NEIGHBOURS = [
  { c: 0xcfe4ff, s: 26, pos: [260, 90, -120] },   // Sirius
  { c: 0xff7a4d, s: 34, pos: [-310, -50, 160] },  // Betelgeuse
  { c: 0xffe6b8, s: 20, pos: [190, -130, 260] },  // Alpha Centauri
  { c: 0xd6e9ff, s: 18, pos: [-160, 160, -210] }, // Vega
  { c: 0xfff3d6, s: 16, pos: [110, 210, -160] },  // Polaris
  { c: 0xff9a7a, s: 12, pos: [-260, 70, -260] },  // Proxima Centauri
];
const neighbourGroup = new THREE.Group();
NEIGHBOURS.forEach((st) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: st.c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.position.set(...st.pos);
  sp.scale.set(st.s, st.s, 1);
  neighbourGroup.add(sp);
});
scene.add(neighbourGroup);

/* ---------------- Oort Cloud ---------------- */
const oortGroup = new THREE.Group();
{
  const N = isCoarse ? 800 : 1500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = rnd(380, 540);
    const th = rnd(0, Math.PI * 2), ph = Math.acos(rnd(-1, 1));
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  oortGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xafc4e8, size: 1.7, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
}
scene.add(oortGroup);

/* ---------------- Kuiper Belt ---------------- */
const kuiperGroup = new THREE.Group();
{
  const N = isCoarse ? 700 : 1300;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = rnd(198, 262);
    const a = rnd(0, Math.PI * 2);
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = rnd(-14, 14);
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  kuiperGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb8d8, size: 1.9, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })));
}
scene.add(kuiperGroup);

/* ---------------- the Sun ---------------- */
const systemGroup = new THREE.Group();
scene.add(systemGroup);
const sunGroup = new THREE.Group();
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(8, 48, 48), new THREE.MeshBasicMaterial({ map: sunTex }));
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb13d, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
sunGlow.scale.set(46, 46, 1);
sunGroup.add(sunMesh, sunGlow);
systemGroup.add(sunGroup);

/* Parker Solar Probe — tight fast orbit around the Sun */
const parker = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xcfd6dd }));
systemGroup.add(parker);

/* Aditya-L1 (Sun–Earth L1) and JWST (Sun–Earth L2) */
function miniStation(bodyC, panelC) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: bodyC })));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.7), new THREE.MeshBasicMaterial({ color: panelC })));
  return g;
}
const aditya = miniStation(0xd8b13a, 0x2a4d8f);
aditya.position.set(44, 2.5, 0);
systemGroup.add(aditya);
const jwst = miniStation(0xc9a227, 0xc9a227);
jwst.position.set(60, -3, 5);
systemGroup.add(jwst);

/* ---------------- planets + moons + our machines ---------------- */
const PLANETS = [
  { name: 'MERCURY', x: 26, r: 1.0, tex: () => rockyTexture('#9c8e82', '#5e544b', '#c4b8aa'), spin: 0.05, moons: [] },
  { name: 'VENUS', x: 38, r: 1.6, tex: () => bandsTexture(['#e8c87e', '#d9a94f', '#f2e2b0', '#c98f3d']), spin: -0.03, moons: [] },
  { name: 'EARTH', x: 52, r: 1.7, tex: () => earthTex, spin: 0.25, moons: [{ n: 'Moon', d: 3.4, s: 0.45, v: 0.9 }] },
  { name: 'MARS', x: 66, r: 1.3, tex: () => rockyTexture('#c1613b', '#7e3a22', '#e08a5a'), spin: 0.22, moons: [{ n: 'Phobos', d: 2.4, s: 0.24, v: 1.6 }, { n: 'Deimos', d: 3.2, s: 0.17, v: 1.1 }] },
  { name: 'JUPITER', x: 94, r: 4.6, tex: () => bandsTexture(['#d8a05e', '#f2e3c2', '#b4713a', '#e8c48a', '#a85f2e']), spin: 0.5, moons: [{ n: 'Io', d: 2.1, s: 0.34, v: 1.4 }, { n: 'Europa', d: 2.8, s: 0.3, v: 1.0 }, { n: 'Ganymede', d: 3.6, s: 0.5, v: 0.7 }, { n: 'Callisto', d: 4.5, s: 0.42, v: 0.5 }] },
  { name: 'SATURN', x: 126, r: 3.8, tex: () => bandsTexture(['#e6cf9a', '#d4b578', '#f4e8c8', '#c9a86a']), spin: 0.45, rings: true, moons: [{ n: 'Enceladus', d: 2.4, s: 0.24, v: 1.5 }, { n: 'Titan', d: 3.2, s: 0.55, v: 0.8 }, { n: 'Rhea', d: 4.0, s: 0.3, v: 0.6 }, { n: 'Dione', d: 4.7, s: 0.28, v: 0.5 }, { n: 'Iapetus', d: 5.6, s: 0.32, v: 0.35 }] },
  { name: 'URANUS', x: 158, r: 2.6, tex: () => bandsTexture(['#9fd8dd', '#7fc4cc', '#bfe8ea']), spin: 0.3, tilt: 1.71, moons: [{ n: 'Miranda', d: 2.3, s: 0.2, v: 1.3 }, { n: 'Ariel', d: 2.9, s: 0.27, v: 1.0 }, { n: 'Umbriel', d: 3.5, s: 0.27, v: 0.8 }, { n: 'Titania', d: 4.3, s: 0.35, v: 0.6 }, { n: 'Oberon', d: 5.0, s: 0.33, v: 0.45 }] },
  { name: 'NEPTUNE', x: 188, r: 2.5, tex: () => bandsTexture(['#3f66d4', '#2c4da8', '#5f83e8', '#243a7d']), spin: 0.32, moons: [{ n: 'Proteus', d: 2.3, s: 0.22, v: 1.2 }, { n: 'Triton', d: 3.1, s: 0.4, v: -0.8 }, { n: 'Nereid', d: 4.3, s: 0.2, v: 0.5 }] },
  { name: 'PLUTO', x: 216, r: 0.9, tex: () => rockyTexture('#b8a88e', '#7a6c58', '#ddd0b8'), spin: 0.08, moons: [{ n: 'Charon', d: 2.8, s: 0.45, v: 0.7 }, { n: 'Nix', d: 3.8, s: 0.14, v: 1.1 }, { n: 'Hydra', d: 4.5, s: 0.14, v: 0.9 }] },
];
const moonGray = new THREE.MeshBasicMaterial({ color: 0xb9c2cc });

function makeISS() {
  const g = new THREE.Group();
  const white = new THREE.MeshBasicMaterial({ color: 0xe8ecf2 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x2a5d8f });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.2), white));
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.42), blue); p1.position.x = -0.72;
  const p2 = p1.clone(); p2.position.x = 0.72;
  g.add(p1, p2);
  return g;
}
function makeHubble() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 12), new THREE.MeshBasicMaterial({ color: 0xc8ccd4 }));
  tube.rotation.z = Math.PI / 2;
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.3), new THREE.MeshBasicMaterial({ color: 0x2a4d8f }));
  p1.position.set(0, -0.25, 0);
  g.add(tube, p1);
  return g;
}

PLANETS.forEach((pl) => {
  const grp = new THREE.Group();
  grp.position.x = pl.x;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(pl.r, 40, 40), new THREE.MeshBasicMaterial({ map: pl.tex() }));
  if (pl.tilt) mesh.rotation.z = pl.tilt;
  grp.add(mesh);
  pl.mesh = mesh; pl.group = grp;
  if (pl.rings) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(pl.r * 1.3, pl.r * 2.15, 72),
      new THREE.MeshBasicMaterial({ map: saturnRingTex, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2 + 0.35;
    grp.add(ring);
  }
  const pts = [];
  for (let a = 0; a <= 96; a++) pts.push(new THREE.Vector3(Math.cos(a / 96 * Math.PI * 2) * pl.x, 0, Math.sin(a / 96 * Math.PI * 2) * pl.x));
  systemGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8fa3c8, transparent: true, opacity: 0.13 })));
  pl.moonMeshes = [];
  pl.moons.forEach((m, mi) => {
    const mm = new THREE.Mesh(new THREE.SphereGeometry(m.s, 18, 18), moonGray);
    grp.add(mm);
    pl.moonMeshes.push({ mesh: mm, ...m, phase: mi * 1.7 });
  });
  pl.craft = [];
  if (pl.name === 'EARTH') {
    const iss = makeISS(), hubble = makeHubble();
    const tiangong = new THREE.Group();
    tiangong.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), new THREE.MeshBasicMaterial({ color: 0xd8d2c4 })));
    tiangong.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.7), new THREE.MeshBasicMaterial({ color: 0x2a4d8f })));
    grp.add(iss, hubble, tiangong);
    pl.craft.push({ obj: iss, d: 2.7, v: 2.2, ph: 0 }, { obj: hubble, d: 3.2, v: 1.7, ph: 2.1 }, { obj: tiangong, d: 3.7, v: 1.4, ph: 4.2 });
    const vikram = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), new THREE.MeshBasicMaterial({ color: 0xd4a017 }));
    vikram.position.set(0, 0.5, 0);
    pl.moonMeshes[0].mesh.add(vikram);
  }
  if (pl.name === 'MARS') {
    const mom = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xff8c42 }));
    grp.add(mom);
    pl.craft.push({ obj: mom, d: 2.7, v: 1.5, ph: 1.0 });
  }
  if (pl.name === 'SATURN') {
    const cassini = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0xd8d8d8 }));
    grp.add(cassini);
    pl.craft.push({ obj: cassini, d: 3.1, v: 1.1, ph: 0.5 });
  }
  systemGroup.add(grp);
});

/* ---------------- the Voyagers (interstellar) ---------------- */
const voyagerGroup = new THREE.Group();
function makeVoyager() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: 0xd4a017 })));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd27a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(7, 7, 1);
  g.add(glow);
  return g;
}
const voy1 = makeVoyager(); voy1.position.set(330, 26, 12);
const voy2 = makeVoyager(); voy2.position.set(312, -20, -14);
voyagerGroup.add(voy1, voy2);
[[330, 26, 12], [312, -20, -14]].forEach(([x, y, z]) => {
  voyagerGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(216, 0, 0), new THREE.Vector3(x, y, z)]),
    new THREE.LineBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.22 })
  ));
});
scene.add(voyagerGroup);

/* ---------------- camera journey ---------------- */
const stops = [
  { p: 0.00, name: 'MILKY WAY', pos: [0, 150, 620], look: [0, 0, 0] },
  { p: 0.075, name: 'STELLAR NEIGHBORHOOD', pos: [0, 80, 400], look: [0, 0, 0] },
  { p: 0.122, name: 'OORT CLOUD', pos: [80, 140, 470], look: [0, 0, 0] },
  { p: 0.175, name: 'THE SUN', pos: [0, 20, 110], look: [0, 0, 0] },
  { p: 0.215, name: 'THE SUN', pos: [15, 6, 36], look: [0, 0, 0] },
];
const FOCUS = { MERCURY: 0.265, VENUS: 0.315, EARTH: 0.365, MARS: 0.415, JUPITER: 0.465, SATURN: 0.515, URANUS: 0.565, NEPTUNE: 0.615, PLUTO: 0.665 };
PLANETS.forEach((pl) => {
  const cx = pl.x - (6 + pl.r * 2.2);
  stops.push({ p: FOCUS[pl.name], name: pl.name, pos: [cx, 3 + pl.r * 0.8, 10 + pl.r * 2.4], look: [pl.x, 0, 0], planet: pl });
});
stops.push({ p: 0.712, name: 'KUIPER BELT', pos: [196, 26, 62], look: [228, 0, 0] });
stops.push({ p: 0.77, name: 'VOYAGERS', pos: [296, 20, 58], look: [326, 8, 0] });
stops.push({ p: 0.92, name: 'FULL SYSTEM', pos: [165, 140, 300], look: [165, 0, 0] });
stops.push({ p: 1.00, name: 'FULL SYSTEM', pos: [165, 140, 300], look: [165, 0, 0] });

const COL_KEYS = [
  { p: 0.00, c: new THREE.Color(0x04060d) },
  { p: 0.20, c: new THREE.Color(0x0a0d18) },
  { p: 0.30, c: new THREE.Color(0x170f08) },
  { p: 0.60, c: new THREE.Color(0x0a0f1c) },
  { p: 1.00, c: new THREE.Color(0x05070f) },
];
const _pos = new THREE.Vector3(), _look = new THREE.Vector3(), _c = new THREE.Color();

function render(p, t) {
  let i = 0;
  while (i < stops.length - 2 && p > stops[i + 1].p) i++;
  const A = stops[i], B = stops[i + 1], tt = sstep(A.p, B.p, p);
  _pos.set(lerp(A.pos[0], B.pos[0], tt), lerp(A.pos[1], B.pos[1], tt), lerp(A.pos[2], B.pos[2], tt));
  _look.set(lerp(A.look[0], B.look[0], tt), lerp(A.look[1], B.look[1], tt), lerp(A.look[2], B.look[2], tt));
  camera.position.copy(_pos);
  camera.position.x += Math.sin(t * 0.45) * 0.6;
  camera.position.y += Math.cos(t * 0.38) * 0.45;
  camera.lookAt(_look);
  camera.rotation.z += Math.sin(p * Math.PI * 2) * 0.02;

  let ci = 0;
  while (ci < COL_KEYS.length - 2 && p > COL_KEYS[ci + 1].p) ci++;
  const CA = COL_KEYS[ci], CB = COL_KEYS[ci + 1], ct2 = sstep(CA.p, CB.p, p);
  _c.copy(CA.c).lerp(CB.c, ct2);
  scene.background.copy(_c);
  scene.fog.color.copy(_c);
  const fogT = sstep(0.14, 0.30, p);
  scene.fog.near = lerp(420, 60, fogT);
  scene.fog.far = lerp(1700, 300, fogT);

  const eGal = 1 - sstep(0.10, 0.20, p);
  galaxyGroup.visible = eGal > 0.004;
  galaxyGroup.children[0].material.opacity = 0.95 * eGal;
  galaxyGroup.rotation.y = t * 0.004;

  const eMark = 1 - sstep(0.05, 0.11, p);
  markerGroup.visible = eMark > 0.004;
  const mp = 1 + 0.12 * Math.sin(t * 3);
  markerRing.scale.set(mp, mp, 1);
  markerRing.material.opacity = 0.9 * eMark;
  markerGlow.material.opacity = 0.85 * eMark;

  const eStars = env(p, 0.02, 0.06, 0.17, 0.25);
  neighbourGroup.visible = eStars > 0.004;
  neighbourGroup.children.forEach((sp) => { sp.material.opacity = 0.9 * eStars; });

  const eOort = env(p, 0.06, 0.12, 0.22, 0.32);
  oortGroup.visible = eOort > 0.004;
  oortGroup.children[0].material.opacity = 0.35 * eOort;
  oortGroup.rotation.y = t * 0.002;

  const eKui = env(p, 0.55, 0.65, 0.97, 1.02);
  kuiperGroup.visible = eKui > 0.004;
  kuiperGroup.children[0].material.opacity = 0.5 * eKui;

  systemGroup.visible = p > 0.03;

  sunMesh.rotation.y = t * 0.02;
  const sg = 46 + Math.sin(t * 1.4) * 2.5;
  sunGlow.scale.set(sg, sg, 1);

  const focusName = A.name === B.name ? A.name : (tt < 0.5 ? A.name : B.name);

  parker.visible = focusName === 'THE SUN';
  if (parker.visible) {
    const a = t * 3.0;
    parker.position.set(Math.cos(a) * 15, Math.sin(a * 0.8) * 3, Math.sin(a) * 15);
    parker.rotation.y = t * 2;
  }
  aditya.visible = p > 0.15 && p < 0.48;
  aditya.rotation.y = t * 0.4;
  jwst.visible = p > 0.30 && p < 0.50;
  jwst.rotation.y = t * 0.3;

  PLANETS.forEach((pl) => {
    pl.mesh.rotation.y = t * pl.spin;
    const isFocus = focusName === pl.name;
    pl.moonMeshes.forEach((m) => {
      m.mesh.visible = isFocus;
      if (isFocus) {
        const a = t * m.v + m.phase;
        m.mesh.position.set(Math.cos(a) * m.d * pl.r, Math.sin(a * 0.9) * m.d * pl.r * 0.25, Math.sin(a) * m.d * pl.r);
      }
    });
    pl.craft.forEach((c) => {
      c.obj.visible = isFocus;
      if (isFocus) {
        const a = t * c.v + c.ph;
        c.obj.position.set(Math.cos(a) * c.d * pl.r, Math.sin(a * 0.7) * c.d * pl.r * 0.3, Math.sin(a) * c.d * pl.r);
        c.obj.rotation.y = t * 0.8;
      }
    });
  });

  const eVoy = env(p, 0.68, 0.74, 0.98, 1.02);
  voyagerGroup.visible = eVoy > 0.004;
  voyagerGroup.children.forEach((ch) => {
    if (ch.isLine) ch.material.opacity = 0.22 * eVoy;
    else ch.traverse((c) => { if (c.material) c.material.opacity = (c.isSprite ? 0.7 : 0.9) * eVoy; });
  });
  voy1.rotation.y = t * 0.5; voy2.rotation.y = -t * 0.4;

  renderer.render(scene, camera);
  return focusName;
}

/* ---------------- interpolation engine ---------------- */
let targetP = 0, smoothP = 0;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  targetP = max > 0 ? clamp01(scrollY / max) : 0;
}
addEventListener('scroll', readScroll, { passive: true });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  readScroll();
});
readScroll();

const chapters = [...document.querySelectorAll('.chapter')].map((el) => ({
  el, from: parseFloat(el.dataset.from), to: parseFloat(el.dataset.to), active: false,
}));
let lastStop = '';
function syncChapters(p, focusName) {
  for (const ch of chapters) {
    const on = p > ch.from && p < ch.to;
    if (on !== ch.active) { ch.active = on; ch.el.classList.toggle('is-active', on); }
  }
  if (focusName !== lastStop) { lastStop = focusName; hudStop.textContent = focusName; }
  const pct = (p * 100).toFixed(2) + '%';
  hudBar.style.width = pct;
  hudKnob.style.left = pct;
}

let fpsEma = 60, lastFpsText = 0, lastQuality = 0;
function syncPerf(dt, t) {
  if (dt > 0) fpsEma += (1 / dt - fpsEma) * 0.06;
  if (t - lastFpsText > 0.5) {
    lastFpsText = t;
    const f = Math.round(fpsEma);
    hudFps.textContent = `${f} fps`;
    hudFps.className = 'hud-fps ' + (f >= 40 ? 'good' : 'warn');
  }
  if (t - lastQuality > 2.5) {
    lastQuality = t;
    if (fpsEma < 34 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
    } else if (fpsEma > 57 && pixelRatio < PR_CAP) {
      pixelRatio = Math.min(PR_CAP, pixelRatio + 0.25);
      renderer.setPixelRatio(pixelRatio);
    }
  }
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const k = 1 - Math.exp(-dt * 5.5);
  smoothP += (targetP - smoothP) * k;
  if (Math.abs(targetP - smoothP) < 0.0004) smoothP = targetP;
  const focusName = render(smoothP, t);
  syncChapters(smoothP, focusName);
  syncPerf(dt, t);
}

renderer.setSize(innerWidth, innerHeight);

if (reducedMotion) {
  render(0.02, 0);
  chapters.forEach((ch) => { ch.active = true; ch.el.classList.add('is-active'); });
} else {
  frame();
}
