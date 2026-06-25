import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

// ── Renderer ──────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

// ── Scene & Camera ────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04040e);
scene.fog = new THREE.Fog(0x04040e, 80, 290);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(1.5, 2.4, 9.5);
camera.lookAt(0, 0.4, -6);
let camZ = 9.5, camShakeX = 0, camShakeY = 0, totalScroll = 0;

// ── Lighting constants (tune here for day/night balance) ──
const NIGHT_AMBIENT_INTENSITY    = 2.0;
const NIGHT_MOONLIGHT_INTENSITY  = 1.10;
const NIGHT_FILL_INTENSITY       = 0.55;
const PLAYER_CAR_LIGHT_INTENSITY = 2.8;

// ── Lighting ──────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x223355, NIGHT_AMBIENT_INTENSITY));

const carGlowLight = new THREE.PointLight(0xffffff, 4.2, 38, 1.4);
carGlowLight.position.set(0, 4.8, 5.2);
scene.add(carGlowLight);

const carNeonGlowLight = new THREE.PointLight(0x66ffff, 3.2, 28, 1.6);
carNeonGlowLight.position.set(0, 2.2, 3.2);
scene.add(carNeonGlowLight);
const moonLight = new THREE.DirectionalLight(0xaabbee, NIGHT_MOONLIGHT_INTENSITY);
moonLight.position.set(-5, 15, 8);
moonLight.castShadow = true;
scene.add(moonLight);
const fillLight = new THREE.DirectionalLight(0x664488, NIGHT_FILL_INTENSITY);
fillLight.position.set(10, 8, 5);
scene.add(fillLight);

// ── Stars — two layers (small dense + large bright) ───────
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(1000 * 3);
for (let i = 0; i < 1000; i++) {
  starPos[i * 3]     = (Math.random() - 0.5) * 700;
  starPos[i * 3 + 1] = 12 + Math.random() * 95;
  starPos[i * 3 + 2] = -50 - Math.random() * 450;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xddeeff, size: 0.32 });
scene.add(new THREE.Points(starGeo, starMat));

const starBrightGeo = new THREE.BufferGeometry();
const starBrightPos = new Float32Array(130 * 3);
for (let i = 0; i < 130; i++) {
  starBrightPos[i * 3]     = (Math.random() - 0.5) * 650;
  starBrightPos[i * 3 + 1] = 14 + Math.random() * 85;
  starBrightPos[i * 3 + 2] = -60 - Math.random() * 420;
}
starBrightGeo.setAttribute('position', new THREE.BufferAttribute(starBrightPos, 3));
const starBrightMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.88 });
scene.add(new THREE.Points(starBrightGeo, starBrightMat));

// ── Road constants ────────────────────────────────────────
const ROAD_W    = 14;
const SEG_LEN   = 60;
const N_SEGS    = 8;
const TOTAL_LEN = N_SEGS * SEG_LEN;
const LANES     = [-4.5, 0, 4.5];

// ── Road materials ────────────────────────────────────────
const matRoad   = new THREE.MeshLambertMaterial({ color: 0x18182a });
const matGround = new THREE.MeshLambertMaterial({ color: 0x0c0c18 });
const matEdge   = new THREE.MeshLambertMaterial({ color: 0x00ccff, emissive: new THREE.Color(0x00ccff), emissiveIntensity: 0.65 });
const matLine   = new THREE.MeshLambertMaterial({ color: 0xbb66ff, emissive: new THREE.Color(0xbb66ff), emissiveIntensity: 0.55 });

// ── Road segments ─────────────────────────────────────────
const roadSegs = [], groundSegs = [], edgeSegs = [];
for (let i = 0; i < N_SEGS; i++) {
  const z    = 10 - i * SEG_LEN;
  const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.3, SEG_LEN), matRoad);
  road.position.set(0, -0.15, z); road.receiveShadow = true;
  scene.add(road); roadSegs.push(road);

  const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 0.1, SEG_LEN), matGround);
  ground.position.set(0, -0.2, z);
  scene.add(ground); groundSegs.push(ground);

  for (const ex of [-ROAD_W / 2 + 0.3, ROAD_W / 2 - 0.3]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, SEG_LEN), matEdge);
    e.position.set(ex, -0.08, z);
    scene.add(e); edgeSegs.push(e);
  }
}

// ── Lane dashes ───────────────────────────────────────────
const DASH_SPACING = 8, N_DASHES = 30, DASH_TOTAL = N_DASHES * DASH_SPACING;
const allDashes = [];
for (const [sx, w, h] of [[0, 0.3, 3.5], [-4.5, 0.2, 2.5], [4.5, 0.2, 2.5]]) {
  for (let i = 0; i < N_DASHES; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(w, 0.36, h), matLine);
    d.position.set(sx, -0.08, 5 - i * DASH_SPACING);
    scene.add(d); allDashes.push(d);
  }
}

// ── Neon palette ──────────────────────────────────────────
const NEON_HEX = [0x00ffee, 0xff44cc, 0x44aaff, 0xff7700, 0xcc44ff];
const neonMats = NEON_HEX.map(c =>
  new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c), emissiveIntensity: 0.95 })
);

// ── Curve & theme system ───────────────────────────────────
const CURVE_STRENGTH    = 3.0;  // max decorative X offset
const THEME_SWITCH_DIST = 300;  // metres per theme

const THEMES = [
  { sky:0x04040e, edge:0x00ccff, lane:0xbb66ff, neons:[0x00ffee,0xff44cc,0x44aaff,0xff7700,0xcc44ff] },
  { sky:0x010209, edge:0x2255ff, lane:0x4466ff, neons:[0x2244ff,0x1133ee,0x0055ff,0x3366ff,0x0033dd] },
  { sky:0x080015, edge:0xcc44ff, lane:0x9922ff, neons:[0xcc44ff,0x8822ff,0xee66ff,0x6611cc,0xbb33ee] },
  { sky:0x001218, edge:0x00ffaa, lane:0x00cc88, neons:[0x00ffaa,0x00cc88,0x00ee99,0x00ff77,0x22ddaa] },
];
let themeIdx = 0, themeNext = 0, themeT = 1.0;
const _tFrom = {
  sky:  new THREE.Color(THEMES[0].sky),
  edge: new THREE.Color(THEMES[0].edge),
  lane: new THREE.Color(THEMES[0].lane),
  neons: THEMES[0].neons.map(c => new THREE.Color(c)),
};

function blendTheme(dt) {
  if (themeT >= 1.0) return;
  themeT = Math.min(1.0, themeT + dt * 0.35);
  const to = THEMES[themeNext];
  const skyC = _tFrom.sky.clone().lerp(new THREE.Color(to.sky), themeT);
  scene.background = skyC; scene.fog.color.copy(skyC);
  const edgeC = _tFrom.edge.clone().lerp(new THREE.Color(to.edge), themeT);
  matEdge.color.copy(edgeC); matEdge.emissive.copy(edgeC);
  const laneC = _tFrom.lane.clone().lerp(new THREE.Color(to.lane), themeT);
  matLine.color.copy(laneC); matLine.emissive.copy(laneC);
  to.neons.forEach((c, i) => {
    const nc = _tFrom.neons[i].clone().lerp(new THREE.Color(c), themeT);
    neonMats[i].color.copy(nc); neonMats[i].emissive.copy(nc);
  });
  if (themeT >= 1.0) themeIdx = themeNext;
}

function checkThemeSwitch(dist) {
  const next = Math.floor(dist / THEME_SWITCH_DIST) % THEMES.length;
  if (next !== themeIdx && themeT >= 1.0) {
    _tFrom.sky.copy(scene.background);
    _tFrom.edge.copy(matEdge.color);
    _tFrom.lane.copy(matLine.color);
    neonMats.forEach((m, i) => _tFrom.neons[i].copy(m.color));
    themeNext = next; themeT = 0.0;
  }
}

// ── Neon pillars ──────────────────────────────────────────
const PILLAR_SPACING = 20, N_PILLARS = 14, PILLAR_TOTAL = N_PILLARS * PILLAR_SPACING;
const neonMeshes = [];
for (const side of [-1, 1]) {
  const px = side * (ROAD_W / 2 + 2.8);
  for (let i = 0; i < N_PILLARS; i++) {
    const mat  = neonMats[i % neonMats.length];
    const z    = 10 - i * PILLAR_SPACING;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6), mat);
    pole.position.set(px, 2, z); pole.userData.baseX = px; scene.add(pole); neonMeshes.push(pole);
    const orb  = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat);
    orb.position.set(px, 4.4, z); orb.userData.baseX = px; scene.add(orb); neonMeshes.push(orb);
  }
}

// ── Neon arch gates ───────────────────────────────────────
const GATE_SPACING = 80, N_GATES = 6, GATE_TOTAL = N_GATES * GATE_SPACING;
const gateMeshes = [];
for (let i = 0; i < N_GATES; i++) {
  const mat = neonMats[i % neonMats.length];
  const z   = 10 - i * GATE_SPACING;
  const gx  = ROAD_W / 2 + 0.4;
  const h   = 9;
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, h, 6), mat);
    p.position.set(sx * gx, h / 2, z); scene.add(p); gateMeshes.push(p);
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat);
    corner.position.set(sx * gx, h + 0.27, z); scene.add(corner); gateMeshes.push(corner);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 1.2, 0.55, 0.55), mat);
  bar.position.set(0, h + 0.27, z); scene.add(bar); gateMeshes.push(bar);
}

// ── Near buildings ────────────────────────────────────────
const BLDG_SPACING = 30, N_BLDGS = 12, BLDG_TOTAL = N_BLDGS * BLDG_SPACING;
const bldgGroups = [];
for (const side of [-1, 1]) {
  for (let i = 0; i < N_BLDGS; i++) {
    const bh  = 10 + (i % 6) * 5;
    const bw  = 6  + (i % 4) * 3.5;
    const bx  = side * (ROAD_W / 2 + 10 + bw * 0.5);
    const z   = 5 - i * BLDG_SPACING;
    const nc  = neonMats[(i + (side > 0 ? 2 : 0)) % neonMats.length];
    const nc2 = neonMats[(i + 1) % neonMats.length];
    const g   = new THREE.Group();
    g.position.set(bx, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 8), new THREE.MeshLambertMaterial({ color: 0x07071a }));
    body.position.set(0, bh / 2, 0); g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, 0.5, 8.3), nc);
    top.position.y = bh + 0.25; g.add(top);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, bh, 0.35), nc2);
    strip.position.set(-side * (bw / 2), bh / 2, 0); g.add(strip);
    g.userData.baseX = bx; scene.add(g); bldgGroups.push(g);
  }
}

// ── Far buildings ─────────────────────────────────────────
const FAR_SPACING = 50, N_FAR = 8, FAR_TOTAL = N_FAR * FAR_SPACING;
const farGroups = [];
for (const side of [-1, 1]) {
  for (let i = 0; i < N_FAR; i++) {
    const bh = 20 + (i % 5) * 8;
    const bw = 9  + (i % 3) * 4;
    const bx = side * (ROAD_W / 2 + 52 + bw * 0.5);
    const z  = -i * FAR_SPACING;
    const nc = neonMats[(i + 3) % neonMats.length];
    const g  = new THREE.Group();
    g.position.set(bx, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 12), new THREE.MeshLambertMaterial({ color: 0x050510 }));
    body.position.set(0, bh / 2, 0); g.add(body);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.4, 4, bw * 0.4), nc);
    tip.position.set(0, bh + 2, 0); g.add(tip);
    g.userData.baseX = bx; scene.add(g); farGroups.push(g);
  }
}

// ── Japanese torii ────────────────────────────────────────
const TORII_SPACING = 60, N_TORII = 5, TORII_TOTAL = N_TORII * TORII_SPACING;
const toriiGroups = [];
const matTorii   = new THREE.MeshLambertMaterial({ color: 0xff4422, emissive: new THREE.Color(0xff4422), emissiveIntensity: 0.4 });
const matLantern = new THREE.MeshLambertMaterial({ color: 0xffee88, emissive: new THREE.Color(0xffee88), emissiveIntensity: 1.0 });
for (const side of [-1, 1]) {
  for (let i = 0; i < N_TORII; i++) {
    const tx = side * (ROAD_W / 2 + 23);
    const z  = -15 - i * TORII_SPACING;
    const g  = new THREE.Group();
    g.position.set(tx, 0, z);
    for (const px of [-1.2, 1.2]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 5, 6), matTorii);
      p.position.set(px, 2.5, 0); g.add(p);
    }
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 0.5), matTorii);
    kasagi.position.set(0, 5.3, 0); g.add(kasagi);
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 0.35), matTorii);
    nuki.position.set(0, 4.0, 0); g.add(nuki);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 6), matLantern);
    lantern.position.set(0, 4.65, 0); g.add(lantern);
    g.userData.baseX = tx; scene.add(g); toriiGroups.push(g);
  }
}

// ── Car color ─────────────────────────────────────────────
// One-time reset so the default red takes effect for returning users.
if (localStorage.getItem('nrColorVer') !== '4') {
  localStorage.removeItem('neonRaceColorKey');
  localStorage.setItem('nrColorVer', '4');
}
const COLOR_MAP = { red: 0xff2200, cyan: 0x00ffee, yellow: 0xffff00, white: 0xffffff };
let selectedColorKey = (() => {
  const k = localStorage.getItem('neonRaceColorKey') || 'red';
  return COLOR_MAP[k] ? k : 'red';
})();
let carBodyMat = null;
let rearLightMat = null;
let glbBodyMeshes = [];

function applyCarColor(hex) {
  if (carBodyMat) {
    carBodyMat.color.setHex(hex);
    carBodyMat.emissive.setHex(hex);
  }
  const tc = new THREE.Color(hex);
  for (const mat of glbBodyMeshes) {
    mat.color.set(tc);
    if (mat.emissive) mat.emissive.setRGB(tc.r * 0.16, tc.g * 0.05, tc.b * 0.05);
    mat.needsUpdate = true;
  }
}

// ── buildCar — simple fallback (used when car.glb is absent) ──────────
function buildCar(bodyColor) {
  const g = new THREE.Group();

  const mBody = new THREE.MeshPhongMaterial({
    color: bodyColor, emissive: new THREE.Color(bodyColor),
    emissiveIntensity: 0.35, shininess: 110, specular: new THREE.Color(0xffffff),
  });
  carBodyMat = mBody;
  const mGlass = new THREE.MeshPhongMaterial({
    color: 0x0d1e3a, transparent: true, opacity: 0.60,
    shininess: 160, specular: new THREE.Color(0x4488cc),
  });
  const mWheel = new THREE.MeshPhongMaterial({ color: 0x0a0a14, shininess: 20 });
  const mHub   = new THREE.MeshPhongMaterial({
    color: 0xaabbcc, emissive: new THREE.Color(0x4466aa), emissiveIntensity: 0.5, shininess: 100,
  });
  const mFront = new THREE.MeshPhongMaterial({
    color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 2.5,
  });
  const mTail  = new THREE.MeshPhongMaterial({
    color: 0xff2233, emissive: new THREE.Color(0xff2233), emissiveIntensity: 1.5,
  });
  rearLightMat = mTail;

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; g.add(m); return m;
  };

  // Lower body sill
  add(new THREE.BoxGeometry(1.70, 0.28, 4.00), mBody, 0, 0.14, 0);
  // Cabin (narrower, raised)
  add(new THREE.BoxGeometry(1.42, 0.44, 1.60), mBody, 0, 0.52, -0.18);

  // Windshield
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.42, 0.05), mGlass);
  ws.position.set(0, 0.52, 0.64); ws.rotation.x = -0.90; g.add(ws);
  // Rear window
  const rw = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.36, 0.05), mGlass);
  rw.position.set(0, 0.52, -0.84); rw.rotation.x =  0.90; g.add(rw);
  // Side windows
  const swR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.10), mGlass);
  swR.position.set( 0.72, 0.52, -0.18); g.add(swR);
  const swL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.10), mGlass);
  swL.position.set(-0.72, 0.52, -0.18); g.add(swL);

  // 4 tires — flush with body sides, no protruding arch plates
  const TX = 0.86, FZ = 1.28, RZ = -1.22;
  for (const [tx, tz] of [[-TX,FZ],[TX,FZ],[-TX,RZ],[TX,RZ]]) {
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16), mWheel, tx, 0.34, tz, 0, 0, Math.PI/2);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.24,  8), mHub,   tx, 0.34, tz, 0, 0, Math.PI/2);
  }

  // Headlights
  add(new THREE.CylinderGeometry(0.10, 0.10, 0.08, 12), mFront,  0.52, 0.20, 2.02, Math.PI/2);
  add(new THREE.CylinderGeometry(0.10, 0.10, 0.08, 12), mFront, -0.52, 0.20, 2.02, Math.PI/2);
  // Taillights
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), mTail,  0.52, 0.20, -2.02, Math.PI/2);
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), mTail, -0.52, 0.20, -2.02, Math.PI/2);

  const pl = new THREE.PointLight(0xffffff, 2.0, 6, 2);
  pl.position.set(0, 3, 0); g.add(pl);

  return g;
}

const playerCar = buildCar(COLOR_MAP[selectedColorKey]);
playerCar.position.set(0, 0, 3);
playerCar.visible = false; // hidden until GLB loads (or fails)
scene.add(playerCar);

// ── GLB adjustment constants ───────────────────────────────
const GLB_CAR_ROTATION_Y          = Math.PI; // 180° — adjust if model faces wrong way
const GLB_CAR_SCALE               = 1.0;     // uniform scale
const GLB_CAR_POSITION_Y          = 0.0;     // vertical offset above road
const GLB_BODY_BRIGHTNESS         = 1.65;    // color multiplier for body meshes
const GLB_BODY_EMISSIVE_INTENSITY = 1.4;     // emissive strength (night visibility)
const GLB_TIRE_STEER_ZERO         = true;    // zero baked-in steering angle on wheel nodes

// ── GLB model loader (replaces fallback if car.glb exists) ────────────
{
  const loader = new GLTFLoader();
  loader.load(
    '/models/car.glb',
    (gltf) => {
      while (playerCar.children.length > 0) playerCar.remove(playerCar.children[0]);
      carBodyMat = null; rearLightMat = null; glbBodyMeshes = [];
      const model = gltf.scene;
      model.rotation.y  = GLB_CAR_ROTATION_Y;
      model.scale.setScalar(GLB_CAR_SCALE);
      model.position.y  = GLB_CAR_POSITION_Y;

      // Fix baked-in steering / tilt on wheel nodes (name-based detection)
      if (GLB_TIRE_STEER_ZERO) {
        model.traverse(node => {
          const n = (node.name || '').toLowerCase();
          if (/wheel|tire|tyre/.test(n)) node.rotation.y = 0;
        });
      }

      model.traverse(c => {
        if (!c.isMesh) return;
        c.castShadow = true;
        const mat = c.material;
        if (!mat || !mat.color) return;
        const { r, g, b } = mat.color;
        // Skip transparent (glass/windows) and near-black (tires/dark interior)
        if ((mat.transparent && mat.opacity < 0.85) || (r + g + b < 0.18)) return;
        glbBodyMeshes.push(mat);
        mat.color.setRGB(
          Math.min(1, r * GLB_BODY_BRIGHTNESS + 0.08),
          Math.min(1, g * 1.12),
          Math.min(1, b * 1.12)
        );
        if (mat.emissive) {
          mat.emissive.setRGB(r * 0.22, g * 0.06, b * 0.06);
          mat.emissiveIntensity = GLB_BODY_EMISSIVE_INTENSITY;
        }
        mat.needsUpdate = true;
      });
      playerCar.add(model);
      const pl = new THREE.PointLight(0xffffff, PLAYER_CAR_LIGHT_INTENSITY, 7, 2);
      pl.position.set(0, 3, 0); playerCar.add(pl);
      const fl = new THREE.PointLight(0xff5533, 1.0, 4, 2);
      fl.position.set(1.4, 1.5, 0); playerCar.add(fl);
      applyCarColor(COLOR_MAP[selectedColorKey]);
      playerCar.visible = true; // show GLB car
    },
    undefined,
    () => { playerCar.visible = true; /* GLB absent — show fallback */ }
  );
}

// ── Particles ─────────────────────────────────────────────
const COIN_PART_MAT   = new THREE.MeshLambertMaterial({ color: 0xffe566, emissive: new THREE.Color(0xffe566), emissiveIntensity: 1.0 });
const BOOST_TRAIL_MAT = new THREE.MeshLambertMaterial({ color: 0x44ccff, emissive: new THREE.Color(0x44ccff), emissiveIntensity: 1.0 });
const PART_GEO        = new THREE.BoxGeometry(0.22, 0.22, 0.22);
const particles       = [];

function createSparkleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,245,160,0.95)');
  grad.addColorStop(0.55, 'rgba(255,200,40,0.45)');
  grad.addColorStop(1, 'rgba(255,200,40,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(32, 3);
  ctx.lineTo(32, 61);
  ctx.moveTo(3, 32);
  ctx.lineTo(61, 32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(52, 52);
  ctx.moveTo(52, 12);
  ctx.lineTo(12, 52);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const COIN_SPARKLE_TEXTURE = createSparkleTexture();

const COIN_SPARKLE_MAT = new THREE.SpriteMaterial({
  map: COIN_SPARKLE_TEXTURE,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  opacity: 1,
  blending: THREE.AdditiveBlending
});


function spawnParticles(x, y, z) {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 2.5 + Math.random() * 2.5;
    const mesh  = new THREE.Mesh(PART_GEO, COIN_PART_MAT);
    mesh.position.set(x, y, z); scene.add(mesh);
    particles.push({ mesh, vx: Math.cos(angle) * speed, vy: 2.5 + Math.random() * 3, life: 1.0 });
  }
}


function spawnCoinSparkles(x, y, z) {
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2 + Math.random() * 0.7;
    const speed = 2.6 + Math.random() * 6.2;

    const mesh = new THREE.Sprite(COIN_SPARKLE_MAT);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.55,
      y + (Math.random() - 0.5) * 0.55,
      z + (Math.random() - 0.5) * 0.55
    );

    const size = 0.38 + Math.random() * 0.75;
    mesh.scale.set(size, size, size);

    scene.add(mesh);

    particles.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: 3.6 + Math.random() * 5.8,
      life: 0.95 + Math.random() * 0.45
    });
  }
}

function spawnBoostTrail(x, y, z) {
  const mesh = new THREE.Mesh(PART_GEO, BOOST_TRAIL_MAT);
  mesh.position.set(x + (Math.random() - 0.5) * 0.7, y + 0.5 + Math.random() * 0.4, z);
  scene.add(mesh);
  particles.push({ mesh, vx: (Math.random() - 0.5) * 0.3, vy: 0.4 + Math.random() * 0.4, life: 0.55 });
}

function updateParticles(dt, scroll) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 3.5;
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += scroll;
    p.vy -= 12 * dt;
    p.mesh.scale.setScalar(p.life);
  }
}

// ── Audio ─────────────────────────────────────────────────
let audioCtx = null, engOsc = null, engGain = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCoinSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2200, audioCtx.currentTime + 0.16);
  gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.22);
}

function playBoostSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(480, audioCtx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.38);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.38);
}

function playCrashSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(), filt = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(110, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(28, audioCtx.currentTime + 0.38);
  filt.type = 'lowpass'; filt.frequency.value = 280;
  gain.gain.setValueAtTime(0.42, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);
  osc.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.42);
}

function startEngine() {
  if (!audioCtx || engOsc) return;
  const filt = audioCtx.createBiquadFilter();
  engOsc = audioCtx.createOscillator(); engGain = audioCtx.createGain();
  engOsc.type = 'sawtooth'; engOsc.frequency.value = 80;
  filt.type = 'lowpass'; filt.frequency.value = 160;
  engGain.gain.value = 0.018;
  engOsc.connect(filt); filt.connect(engGain); engGain.connect(audioCtx.destination);
  engOsc.start();
}

function stopEngine() {
  if (!engOsc || !audioCtx) return;
  const osc = engOsc, gain = engGain; engOsc = null; engGain = null;
  try {
    gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    setTimeout(() => { try { osc.stop(); } catch (_) {} }, 400);
  } catch (_) {}
}

function updateEngineSound(spd) {
  if (!engOsc || !audioCtx) return;
  engOsc.frequency.setTargetAtTime(55 + spd * 1.5, audioCtx.currentTime, 0.12);
}

// ── Mission system ────────────────────────────────────────
const MISSIONS_ORDERED = [
  { id:'coins10', text:'コインを10枚集める', bonus:100, check:s=>s.coinsCollected>=10 },
  { id:'surv30',  text:'30秒生き残る',        bonus:100, check:s=>s.gameTime>=30       },
  { id:'boost2',  text:'ブーストを2回取る',   bonus:150, check:s=>s.boostCount>=2      },
  { id:'score1k', text:'スコア1000点達成',    bonus:200, check:s=>s.score>=1000        },
];
const MISSION_ALL_BONUS = 500;

let missionStep     = 0;
let missionDone     = new Array(MISSIONS_ORDERED.length).fill(false);
let allMissionsDone = false;
let notifyTimer     = 0;
let notifyQueue     = [];

function pickMissions() {
  missionStep     = 0;
  missionDone     = new Array(MISSIONS_ORDERED.length).fill(false);
  allMissionsDone = false;
  notifyQueue     = []; notifyTimer = 0;
  const el = document.getElementById('mission-notify');
  if (el) el.classList.remove('show');
  renderMissionPanel();
}

function renderMissionPanel() {
  const el = document.getElementById('mission-list');
  if (!el) return;
  el.innerHTML = MISSIONS_ORDERED.map((m, i) => {
    const cls  = missionDone[i] ? ' done' : (i === missionStep && !allMissionsDone) ? ' active' : ' locked';
    const mark = missionDone[i] ? '✓' : (i === missionStep && !allMissionsDone) ? '●' : '○';
    const bon  = missionDone[i] ? `<span class="mission-bonus">+${m.bonus}</span>` : '';
    return `<div class="mission-item${cls}"><span class="mission-check">${mark}</span>${m.text}${bon}</div>`;
  }).join('');
}

function _nextNotify() {
  if (notifyQueue.length === 0) return;
  const el = document.getElementById('mission-notify');
  if (!el) return;
  el.textContent = notifyQueue[0];
  el.classList.add('show');
  notifyTimer = 2.5;
}

function showMissionNotify(text) {
  notifyQueue.push(text);
  if (notifyQueue.length === 1) _nextNotify();
}

function checkMissions(gs) {
  if (allMissionsDone || missionStep >= MISSIONS_ORDERED.length) return;
  const m = MISSIONS_ORDERED[missionStep];
  if (m.check(gs)) {
    missionDone[missionStep] = true;
    score += m.bonus;
    showMissionNotify(`MISSION CLEAR!  ${m.text}  +${m.bonus}`);
    missionStep++;
    renderMissionPanel();
    if (missionStep >= MISSIONS_ORDERED.length) {
      allMissionsDone = true;
      score += MISSION_ALL_BONUS;
      setTimeout(() => showMissionNotify(`ALL MISSIONS CLEAR!  +${MISSION_ALL_BONUS}`), 2800);
    }
  }
}

// ── Game state ────────────────────────────────────────────
const START = 'start', PLAYING = 'playing', GAMEOVER = 'gameover';
let state = START;
let score = 0, gameTime = 0;
let baseSpeed = 8, currentSpeed = 8;
let carX = 0, targetX = 0;
let obstacleTimer = 0, coinTimer = 0, boostSpawnTimer = 0;
let boostActive = false, boostTimeLeft = 0, boostTrailTimer = 0;
let shakeTime = 0;
let isPaused = false;

// Extended tracking
let distance      = 0;
let coinsCollected = 0;
let maxSpeedKmh   = 0;
let boostCount    = 0;

const MIN_SPEED  = 3;
const MAX_SPEED  = 40;
const BASE_RAMP  = 0.18;
const ACCEL_RATE = 20;
const DECEL_RATE = 15;
const MOVE_SPEED = 10;
const MAX_X      = ROAD_W / 2 - 1.3;

// ── Input ─────────────────────────────────────────────────
const keys        = new Set();
const virtualKeys = new Set();

function isKey(k) { return keys.has(k) || virtualKeys.has(k); }

function normalizeKey(key, code) {
  if (key === ' ' || code === 'Space') return ' ';
  if (key.toLowerCase() === 'spacebar') return ' ';
  return key.toLowerCase();
}

window.addEventListener('keydown', e => {
  const k = normalizeKey(e.key, e.code);
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === ' ' && state === START)                    startGame();
  if (k === 'r' && (state === GAMEOVER || isPaused))   restart();
  if (k === 'p' && state === PLAYING)                  togglePause();
});
window.addEventListener('keyup', e => keys.delete(normalizeKey(e.key, e.code)));

// ── Mobile controls ───────────────────────────────────────
{
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileEl = document.getElementById('mobile-controls');
  if (mobileEl && isTouchDevice) mobileEl.style.display = 'flex';

  const bindBtn = (id, vk) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const add    = e => { e.preventDefault(); virtualKeys.add(vk); };
    const remove = e => { e.preventDefault(); virtualKeys.delete(vk); };
    btn.addEventListener('touchstart',  add,    { passive: false });
    btn.addEventListener('touchend',    remove, { passive: false });
    btn.addEventListener('touchcancel', remove, { passive: false });
  };
  bindBtn('mob-left',  'arrowleft');
  bindBtn('mob-right', 'arrowright');
  bindBtn('mob-accel', 'arrowup');
  bindBtn('mob-brake', 'arrowdown');
}

// ── Color picker ──────────────────────────────────────────
{
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach(btn => {
    if (btn.dataset.color === selectedColorKey) btn.classList.add('selected');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      selectedColorKey = btn.dataset.color;
      localStorage.setItem('neonRaceColorKey', selectedColorKey);
      applyCarColor(COLOR_MAP[selectedColorKey]);
      swatches.forEach(b => b.classList.toggle('selected', b.dataset.color === selectedColorKey));
    });
  });
}

// ── Obstacles ─────────────────────────────────────────────
const obstacles = [];
const OBS_MATS  = [
  new THREE.MeshLambertMaterial({ color: 0xff3366, emissive: new THREE.Color(0xff3366), emissiveIntensity: 0.5 }),
  new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: new THREE.Color(0xff8800), emissiveIntensity: 0.5 }),
];

function spawnObstacle() {
  if (obstacles.length >= 9) return;
  const incoming = obstacles.filter(o => o.position.z < -40);
  const usedIdxs = new Set(incoming.map(o => LANES.findIndex(lx => Math.abs(o.position.x - lx) < 2)).filter(i => i >= 0));
  const freeIdxs = [0, 1, 2].filter(i => !usedIdxs.has(i));
  if (freeIdxs.length === 0) return;
  const laneIdx = freeIdxs[Math.floor(Math.random() * freeIdxs.length)];

  const geo  = Math.random() > 0.4
    ? new THREE.BoxGeometry(1.4, 1.6, 1.4)
    : new THREE.CylinderGeometry(0.7, 0.7, 1.6, 10);
  const mesh = new THREE.Mesh(geo, OBS_MATS[Math.floor(Math.random() * OBS_MATS.length)]);
  mesh.position.set(LANES[laneIdx], 0.8, -160);
  mesh.castShadow = true;
  scene.add(mesh); obstacles.push(mesh);
}

// ── Boost items ───────────────────────────────────────────
const boostItems = [];
const BOOST_ITEM_MAT = new THREE.MeshLambertMaterial({ color: 0x44aaff, emissive: new THREE.Color(0x44aaff), emissiveIntensity: 0.9 });

function spawnBoostItem() {
  if (boostItems.length >= 2) return;
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), BOOST_ITEM_MAT);
  mesh.position.set(LANES[Math.floor(Math.random() * LANES.length)], 1.6, -160);
  scene.add(mesh); boostItems.push(mesh);
}

// ── Coins ─────────────────────────────────────────────────
const coins    = [];
const COIN_MAT = new THREE.MeshLambertMaterial({ color: 0xffe566, emissive: new THREE.Color(0xffe566), emissiveIntensity: 0.75 });

function spawnCoin() {
  if (coins.length >= 10) return;
  const laneIdx = Math.random() < 0.45 ? 1 : Math.floor(Math.random() * LANES.length);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(48, 36, 8, 64, 64, 58);
  grad.addColorStop(0, '#fff7a8');
  grad.addColorStop(0.45, '#ffd84a');
  grad.addColorStop(1, '#d88a00');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ff9f00';
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff0a0';
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fff3a0';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#5a3200';
  ctx.strokeText('C', 64, 66);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff1a8';
  ctx.strokeText('C', 64, 66);

  ctx.fillStyle = '#d49a00';
  ctx.fillText('C', 64, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const faceMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true
  });

  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb000,
    metalness: 0.75,
    roughness: 0.25,
    emissive: new THREE.Color(0xff9900),
    emissiveIntensity: 0.45
  });

  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.16, 64),
    [edgeMaterial, faceMaterial, faceMaterial]
  );

  coin.rotation.x = Math.PI / 2;
  coin.rotation.y = 0.58;
  coin.position.set(LANES[laneIdx], 2.6, -160);
  coin.scale.set(1.35, 1.35, 1.35);

  scene.add(coin);
  coins.push(coin);
}

// ── HUD ───────────────────────────────────────────────────
const elScore    = document.getElementById('score');
const elSpd      = document.getElementById('spd');
const elGO       = document.getElementById('gameover');
const elStart    = document.getElementById('startscreen');
const elBoostHUD = document.getElementById('boost-hud');

function updateHUD() {
  elScore.textContent = `スコア: ${score}`;
  elSpd.textContent   = `速度: ${Math.round(currentSpeed * 3)} km/h`;
  if (elBoostHUD) {
    elBoostHUD.style.display = boostActive ? 'block' : 'none';
    if (boostActive) elBoostHUD.textContent = `⚡ BOOST! ${boostTimeLeft.toFixed(1)}s`;
  }
}

function flashScore() {
  elScore.classList.remove('flash');
  void elScore.offsetWidth;
  elScore.classList.add('flash');
}

// ── Lane HUD ──────────────────────────────────────────────
function updateLaneHUD() {
  const LOOK = 80;
  const playerLaneIdx = LANES.reduce((best, lx, i) =>
    Math.abs(lx - carX) < Math.abs(LANES[best] - carX) ? i : best, 0);

  for (let i = 0; i < 3; i++) {
    const lx  = LANES[i];
    const box = document.getElementById(`lane-${i}`);
    if (!box) continue;
    const hasObs   = obstacles.some(o => Math.abs(o.position.x - lx) < 2   && o.position.z > 3 - LOOK && o.position.z < 3);
    const hasBoost = boostItems.some(b => Math.abs(b.position.x - lx) < 2  && b.position.z > 3 - LOOK && b.position.z < 3);
    const hasCoin  = coins.some(c => Math.abs(c.position.x - lx) < 2       && c.position.z > 3 - LOOK && c.position.z < 3);

    box.className = 'lane-box';
    if (i === playerLaneIdx) box.classList.add('lane-current');
    if (hasObs)              box.classList.add('lane-danger');
    else if (hasBoost)       box.classList.add('lane-boost');
    else if (hasCoin)        box.classList.add('lane-coin');
  }
}

// ── Rank ──────────────────────────────────────────────────
function calcRank(s) {
  if (s >= 800) return { letter: 'S', color: '#ffd700' };
  if (s >= 400) return { letter: 'A', color: '#00ffee' };
  if (s >= 150) return { letter: 'B', color: '#bb66ff' };
  return           { letter: 'C', color: '#aabbcc' };
}

// ── State transitions ─────────────────────────────────────
function startGame() {
  elStart.style.display = 'none';
  document.getElementById('mission-panel').style.display = 'block';
  state = PLAYING; gameTime = 0;
  pickMissions();
  try { ensureAudio(); startEngine(); } catch (_) {}
}
elStart.addEventListener('click', () => { if (state === START) startGame(); });

function togglePause() {
  isPaused = !isPaused;
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = isPaused ? 'flex' : 'none';
  if (isPaused) stopEngine();
  else { try { ensureAudio(); startEngine(); } catch (_) {} }
}

function showGameOver() {
  stopEngine();
  state   = GAMEOVER;
  isPaused = false;
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = 'none';
  document.getElementById('mission-panel').style.display = 'none';

  const prev = parseInt(localStorage.getItem('neonRaceHigh') || '0');
  const best = Math.max(score, prev);
  localStorage.setItem('neonRaceHigh', best.toString());

  const rank = calcRank(score);

  const goStats = document.getElementById('go-stats');
  if (goStats) {
    const isNew = score > prev;
    goStats.innerHTML = `
      <div class="go-stat"><span class="go-stat-label">最終スコア</span><span class="go-stat-value">${score}</span></div>
      <div class="go-stat"><span class="go-stat-label">ハイスコア</span><span class="go-stat-value${isNew ? ' new-record' : ''}">${best}${isNew ? ' 🏆' : ''}</span></div>
      <div class="go-stat"><span class="go-stat-label">走行距離</span><span class="go-stat-value">${Math.floor(distance)}m</span></div>
      <div class="go-stat"><span class="go-stat-label">取得コイン</span><span class="go-stat-value">${coinsCollected}枚</span></div>
      <div class="go-stat full-row"><span class="go-stat-label">最大速度</span><span class="go-stat-value">${maxSpeedKmh} km/h</span></div>`;
  }

  const goRank = document.getElementById('go-rank');
  if (goRank) {
    goRank.innerHTML = `<span class="rank-badge" style="color:${rank.color};text-shadow:0 0 24px ${rank.color},0 0 60px ${rank.color}40;">RANK ${rank.letter}</span>`;
  }

  const goMissions = document.getElementById('go-missions');
  if (goMissions) {
    goMissions.innerHTML = '<div class="go-mission-title">MISSION</div>' +
      MISSIONS_ORDERED.map((m, i) =>
        `<div class="go-mission-item${missionDone[i] ? ' done' : ''}"><span>${missionDone[i] ? '✓' : '✗'}</span> ${m.text}</div>`
      ).join('');
  }

  boostActive = false; boostTimeLeft = 0;
  notifyQueue = []; notifyTimer = 0;
  const notifyEl = document.getElementById('mission-notify');
  if (notifyEl) notifyEl.classList.remove('show');

  elGO.style.display = 'flex';
}

function restart() {
  obstacles.forEach(o => { scene.remove(o); o.geometry.dispose(); });
  obstacles.length = 0;
  coins.forEach(c => { scene.remove(c); c.geometry.dispose(); });
  coins.length = 0;
  boostItems.forEach(b => { scene.remove(b); b.geometry.dispose(); });
  boostItems.length = 0;
  particles.forEach(p => scene.remove(p.mesh));
  particles.length = 0;

  score = 0; gameTime = 0;
  baseSpeed = 8; currentSpeed = 8;
  carX = 0; targetX = 0;
  obstacleTimer = 0; coinTimer = 0; boostSpawnTimer = 0;
  boostActive = false; boostTimeLeft = 0; boostTrailTimer = 0;
  shakeTime = 0; camZ = 9.5; camShakeX = 0; camShakeY = 0;
  isPaused = false;
  distance = 0; coinsCollected = 0; maxSpeedKmh = 0; boostCount = 0;
  themeIdx = 0; themeNext = 0; themeT = 1.0;
  { const t0 = THEMES[0];
    matEdge.color.setHex(t0.edge); matEdge.emissive.setHex(t0.edge);
    matLine.color.setHex(t0.lane); matLine.emissive.setHex(t0.lane);
    t0.neons.forEach((c,i) => { neonMats[i].color.setHex(c); neonMats[i].emissive.setHex(c); });
    scene.background = new THREE.Color(t0.sky); scene.fog.color.setHex(t0.sky); }

  playerCar.position.x = 0; playerCar.rotation.z = 0;
  elGO.style.display = 'none';
  document.getElementById('pause-overlay').style.display = 'none';
  document.getElementById('mission-panel').style.display = 'block';
  state = PLAYING;

  pickMissions();
  try { ensureAudio(); startEngine(); } catch (_) {}
}

// Start screen high score
{
  const startHigh = document.getElementById('start-highscore');
  const saved     = localStorage.getItem('neonRaceHigh');
  if (startHigh && saved) startHigh.textContent = `ハイスコア: ${saved}`;
}

// Mission panel hidden by default (shown when PLAYING)
document.getElementById('mission-panel').style.display = 'none';

// ── World scroll ──────────────────────────────────────────
function scrollWorld(amount) {
  totalScroll += amount;
  const cx = z => Math.sin(totalScroll * 0.009 + z * 0.007) * CURVE_STRENGTH;
  const recycleRoad = s => {
    s.position.z += amount;
    if (s.position.z > SEG_LEN + 5) s.position.z -= TOTAL_LEN;
  };
  roadSegs.forEach(recycleRoad);
  groundSegs.forEach(recycleRoad);
  edgeSegs.forEach(recycleRoad);
  allDashes.forEach(d   => { d.position.z += amount; if (d.position.z > 8)                   d.position.z -= DASH_TOTAL;    });
  neonMeshes.forEach(m  => {
    m.position.z += amount; if (m.position.z > PILLAR_SPACING + 5)  m.position.z -= PILLAR_TOTAL;
    if (m.userData.baseX !== undefined) m.position.x = m.userData.baseX + cx(m.position.z);
  });
  gateMeshes.forEach(m  => { m.position.z += amount; if (m.position.z > GATE_SPACING + 5)    m.position.z -= GATE_TOTAL;    });
  bldgGroups.forEach(b  => {
    b.position.z += amount; if (b.position.z > BLDG_SPACING + 5)    b.position.z -= BLDG_TOTAL;
    if (b.userData.baseX !== undefined) b.position.x = b.userData.baseX + cx(b.position.z) * 1.6;
  });
  farGroups.forEach(b   => {
    b.position.z += amount; if (b.position.z > FAR_SPACING + 5)     b.position.z -= FAR_TOTAL;
    if (b.userData.baseX !== undefined) b.position.x = b.userData.baseX + cx(b.position.z) * 2.2;
  });
  toriiGroups.forEach(t => {
    t.position.z += amount; if (t.position.z > TORII_SPACING + 5)   t.position.z -= TORII_TOTAL;
    if (t.userData.baseX !== undefined) t.position.x = t.userData.baseX + cx(t.position.z) * 1.3;
  });
}

// ── Main loop ─────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  starMat.size = 0.42 + Math.sin(Date.now() * 0.0008) * 0.14;

  if (state === START) {
    scrollWorld(5 * dt);
    updateParticles(dt, 0);
    camera.lookAt(Math.sin(totalScroll * 0.010) * 2.2, 0.4, -6);
    renderer.render(scene, camera);
    return;
  }

  if (state === GAMEOVER) {
    updateParticles(dt, 0);
    renderer.render(scene, camera);
    return;
  }

  // Paused: render only, no updates
  if (isPaused) {
    renderer.render(scene, camera);
    return;
  }

  // ── PLAYING ───────────────────────────────────────────
  gameTime += dt;

  const diffMult = Math.min(gameTime < 30 ? 0.35 : (gameTime - 30) / 90 + 0.35, 1.0);
  baseSpeed = Math.min(baseSpeed + BASE_RAMP * dt * diffMult, MAX_SPEED);

  const accel = isKey('w') || isKey('arrowup');
  const brake = isKey('s') || isKey('arrowdown');

  if (accel)      currentSpeed = Math.min(currentSpeed + ACCEL_RATE * dt, MAX_SPEED);
  else if (brake) currentSpeed = Math.max(currentSpeed - DECEL_RATE * dt, MIN_SPEED);
  else            currentSpeed += (baseSpeed - currentSpeed) * Math.min(3 * dt, 1);

  // Track max speed
  const kmhNow = Math.round(currentSpeed * 3);
  if (kmhNow > maxSpeedKmh) maxSpeedKmh = kmhNow;

  // Boost
  if (boostActive) {
    boostTimeLeft -= dt;
    currentSpeed = Math.min(currentSpeed + 20 * dt, MAX_SPEED);
    boostTrailTimer += dt;
    if (boostTrailTimer > 0.05) {
      spawnBoostTrail(playerCar.position.x, playerCar.position.y, playerCar.position.z - 2.1);
      boostTrailTimer = 0;
    }
    if (boostTimeLeft <= 0) { boostActive = false; boostTrailTimer = 0; }
  }

  const scroll = currentSpeed * dt;
  distance += scroll;

  // Lateral movement
  if (isKey('arrowleft')  || isKey('a')) targetX -= MOVE_SPEED * dt;
  if (isKey('arrowright') || isKey('d')) targetX += MOVE_SPEED * dt;
  targetX = Math.max(-MAX_X, Math.min(MAX_X, targetX));
  carX += (targetX - carX) * Math.min(8 * dt, 1);
  playerCar.position.x = carX;
  playerCar.rotation.z = (carX - targetX) * 0.12;

  // Tail lights
  if (rearLightMat) rearLightMat.emissiveIntensity = brake ? 2.5 : 0.9;

  // Camera dynamics
  const speedRatio = currentSpeed / MAX_SPEED;
  const targetCamZ = 9.5 + (accel || boostActive ? speedRatio * 2.8 : 0);
  camZ += (targetCamZ - camZ) * Math.min(4 * dt, 1);

  shakeTime += dt;
  if (speedRatio > 0.65 || boostActive) {
    const amt = (speedRatio - 0.65 + (boostActive ? 0.15 : 0)) * 0.09;
    camShakeX = Math.sin(shakeTime * 28) * amt;
    camShakeY = Math.cos(shakeTime * 21) * amt * 0.5;
  } else {
    camShakeX *= 0.82; camShakeY *= 0.82;
  }
  const curveSway = Math.sin(totalScroll * 0.010) * 3.8;
  camera.position.set(1.5 + camShakeX, 2.4 + camShakeY, camZ);
  camera.lookAt(curveSway, 0.4, -6);

  checkThemeSwitch(distance);
  blendTheme(dt);
  scrollWorld(scroll);
  updateParticles(dt, scroll);
  updateEngineSound(currentSpeed);

  // Spawn timers
  const obsInterval = Math.max((gameTime < 30 ? 3.8 : 2.5) - currentSpeed * 0.025 * diffMult, 0.55);
  obstacleTimer += dt; if (obstacleTimer >= obsInterval)  { spawnObstacle();  obstacleTimer  = 0; }
  coinTimer     += dt; if (coinTimer     >= 0.65)          { spawnCoin();      coinTimer      = 0; }
  boostSpawnTimer += dt; if (boostSpawnTimer >= 5.0)       { spawnBoostItem(); boostSpawnTimer = 0; }

  for (const b of boostItems) { b.rotation.y += 2.8 * dt; b.rotation.x += 1.4 * dt; }

  // Obstacle collisions
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.position.z += scroll;
    o.rotation.y += 1.2 * dt;
    if (Math.abs(o.position.x - carX) < 1.6 && Math.abs(o.position.z - 3) < 2.2) {
      playCrashSound(); showGameOver(); return;
    }
    if (o.position.z > 12) {
      scene.remove(o); o.geometry.dispose(); obstacles.splice(i, 1);
    }
  }

  // Boost pickup
  for (let i = boostItems.length - 1; i >= 0; i--) {
    const b = boostItems[i];
    b.position.z += scroll;
    if (Math.abs(b.position.x - carX) < 1.8 && Math.abs(b.position.z - 3) < 2.0) {
      boostActive = true; boostTimeLeft = 3.0; boostTrailTimer = 0;
      boostCount++;
      playBoostSound();
      scene.remove(b); b.geometry.dispose(); boostItems.splice(i, 1); continue;
    }
    if (b.position.z > 12) {
      scene.remove(b); b.geometry.dispose(); boostItems.splice(i, 1);
    }
  }

  // Coin collisions
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.position.z += scroll;
    c.rotation.z += 3.0 * dt;
    if (Math.abs(c.position.x - carX) < 1.9 && Math.abs(c.position.z - 3) < 2.2) {
      score += boostActive ? 20 : 10;
      coinsCollected++;
      spawnParticles(c.position.x, c.position.y, c.position.z);
      flashScore(); playCoinSound();
      scene.remove(c); c.geometry.dispose(); coins.splice(i, 1); continue;
    }
    if (c.position.z > 12) {
      scene.remove(c); c.geometry.dispose(); coins.splice(i, 1);
    }
  }

  // Mission check
  checkMissions({ gameTime, coinsCollected, boostCount, maxSpeedKmh, distance, score });

  // Notification fade-out
  if (notifyTimer > 0) {
    notifyTimer -= dt;
    if (notifyTimer <= 0) {
      const el = document.getElementById('mission-notify');
      if (el) el.classList.remove('show');
      notifyQueue.shift();
      setTimeout(() => _nextNotify(), 350);
    }
  }

  updateHUD();
  updateLaneHUD();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
