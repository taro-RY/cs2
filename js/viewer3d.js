/* ============================================================
   VIEWER3D — 真实 3D 武器检视（Three.js / WebGL）
   - PBR 材质分层（金属 / 木材 / 贴图）+ RoomEnvironment 反射
   - OrbitControls：拖拽带惯性、滚轮缩放、触摸单指旋转双指缩放
   - 部件 3D 锚点：每帧投影到屏幕，点击 raycast 聚焦
   - M4A1-S 程序化消音器 / M4A4 三叉消焰器
   模型：CC BY 4.0 · poly.pizza（详见 assets/CREDITS.txt）
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GOLD = 0xde9b35;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 模型归一化后的目标长度（世界单位）
const MODEL_CONFIG = {
  ak47:    { file: 'ak47.glb',    length: 6.4, camera: [0.25, 0.55, 8.2],  targetY: 0.15, autoRotate: 0.9 },
  m4a4:    { file: 'm4a4.glb',    length: 6.4, camera: [0.25, 0.55, 8.2],  targetY: 0.15, autoRotate: 0.9, attachment: 'flashhider', flipX: true },
  m4a1s:   { file: 'm4a4.glb',    length: 6.6, camera: [0.25, 0.55, 8.4],  targetY: 0.15, autoRotate: 0.9, attachment: 'suppressor', flipX: true },
  molotov: { file: 'molotov.glb', length: 4.4, camera: [1.7, 1.35, 5.4],  targetY: 0.05, autoRotate: 0.7, upright: true }
};

let renderer = null, scene = null, camera = null, controls = null, stageEl = null;
let rafOn = false, current = null;
const templates = {};            // id -> 增强后的模板 Group
const loadQueue = {};            // 进行中的加载 Promise
let anchors = [];                // 当前部件锚点 Object3D[]
let hotScreens = [];             // 每帧投影结果
let meshList = [];               // raycast 目标（仅 Mesh，排除描边线）
let onFrameCb = null, onSelectCb = null;
let tween = null, autoCancelled = false;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

/* ---------------- 场景搭建 ---------------- */
function ensureScene() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stageEl.appendChild(renderer.domElement);
  renderer.domElement.className = 'v3d-canvas';

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.Fog(0x0a0c10, 11, 20);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;      // 松手惯性
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.85;
  controls.enablePan = false;
  controls.minDistance = 3.0;
  controls.maxDistance = 10.5;
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.78;

  // 三点布光：暖主光 / 冷补光 / 金轮廓光
  const key = new THREE.DirectionalLight(0xffdca6, 2.6);
  key.position.set(4.5, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 20;
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb4ff, 0.75);
  fill.position.set(-5, 1.2, 3.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffb347, 1.8);
  rim.position.set(-2.5, 3.2, -5.5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x2a2d3a, 0.55));

  buildStage();
  bindPointer();

  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);
  resize();
}

// 圆形战术台 + 同心环
let ringMat;
function buildStage() {
  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x0d1015, roughness: 0.82, metalness: 0.25 })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -1.72;
  deck.receiveShadow = true;
  scene.add(deck);

  [2.2, 3.4, 4.6].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.012, r + 0.012, 80),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: i === 2 ? 0.22 : 0.13, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.705;
    scene.add(ring);
  });
}

function resize() {
  if (!renderer || !stageEl) return;
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  if (w < 8 || h < 8) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---------------- 材质分层（按模型自带材质名） ---------------- */
function upgradeMaterial(mat) {
  const name = (mat.name || '').toLowerCase();
  const out = mat.clone();
  if (name.includes('wood')) {
    out.metalness = 0.05;
    out.roughness = 0.56;
    out.envMapIntensity = 0.65;
  } else if (out.map) {
    // 燃烧瓶：保留贴图，轻微物理感
    out.metalness = 0.1;
    out.roughness = 0.4;
    out.envMapIntensity = 0.9;
  } else {
    // 深色件更粗糙，浅灰件更抛光，形成枪身层次
    const hex = out.color ? out.color.getHex() : 0x444444;
    const lum = ((hex >> 16 & 255) + (hex >> 8 & 255) + (hex & 255)) / 3;
    out.metalness = 0.92;
    out.roughness = THREE.MathUtils.clamp(0.52 - lum / 255 * 0.28, 0.24, 0.5);
    out.envMapIntensity = 1.2;
  }
  return out;
}

/* ---------------- 程序化枪口附件 ---------------- */
function metalPartMat() {
  return new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: 0.94, roughness: 0.3, envMapIntensity: 1.25 });
}
function addAttachment(root, kind, box, flipX) {
  // 枪口端：AK 朝 -X，M4 平台朝 +X；枪管高度约在包围盒 64%
  const size0 = box.getSize(new THREE.Vector3());
  const mx = flipX ? box.max.x + size0.x * 0.015 : box.min.x - size0.x * 0.015;
  const dir = flipX ? 1 : -1;
  const my = box.min.y + size0.y * 0.64;
  const mat = metalPartMat();

  if (kind === 'suppressor') {
    const len = size0.x * 0.16;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, len, 30), mat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(mx + dir * len * 0.5, my, 0);
    tube.castShadow = true;
    root.add(tube);
    // 前后环 + 中部箍
    [0.06, 0.5, 0.94].forEach(k => {
      const ringM = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.05, 30), mat);
      ringM.rotation.z = Math.PI / 2;
      ringM.position.set(mx + dir * k * len, my, 0);
      root.add(ringM);
    });
  } else if (kind === 'flashhider') {
    const len = size0.x * 0.065;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, len, 22), mat);
    base.rotation.z = Math.PI / 2;
    base.position.set(mx + dir * len * 0.4, my, 0);
    base.castShadow = true;
    root.add(base);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.06, 22), mat);
    head.rotation.z = Math.PI / 2;
    head.position.set(mx + dir * len * 1.0, my, 0);
    root.add(head);
  }
}

/* ---------------- 加载 + 构建增强模板（缓存） ---------------- */
const loader = new GLTFLoader();
function getTemplate(id) {
  if (templates[id]) return Promise.resolve(templates[id]);
  if (loadQueue[id]) return loadQueue[id];

  const cfg = MODEL_CONFIG[id];
  loadQueue[id] = new Promise((resolve, reject) => {
    loader.load('assets/models/' + cfg.file, (gltf) => {
      const root = gltf.scene;

      // 材质替换
      root.traverse(o => {
        if (!o.isMesh || !o.material) return;
        o.castShadow = true;
        o.receiveShadow = true;
        if (Array.isArray(o.material)) o.material = o.material.map(upgradeMaterial);
        else o.material = upgradeMaterial(o.material);
      });

      const rawBox = new THREE.Box3().setFromObject(root);
      if (cfg.attachment) addAttachment(root, cfg.attachment, rawBox, !!cfg.flipX);

      // 居中 + 归一化长度
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);
      const s = cfg.length / (cfg.upright ? Math.max(size.y, size.x) : size.x);
      root.scale.setScalar(s);

      // 金色战术描边（低多边形 → 蓝图感）
      const edgeMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: cfg.upright ? 0.1 : 0.22 });
      root.traverse(o => {
        if (o.isMesh && o.geometry) {
          const edges = new THREE.EdgesGeometry(o.geometry, 28);
          const lines = new THREE.LineSegments(edges, edgeMat);
          o.add(lines);
        }
      });

      templates[id] = root;
      resolve(root);
    }, undefined, reject);
  });
  return loadQueue[id];
}

/* ---------------- 部件锚点 ----------------
   优先使用 part.a3d（按真实模型逐件标定的归一化坐标）：
   a3d[0] 沿枪长：0=枪托端, 1=枪口端（GLB 枪口朝 -X）
   a3d[1] 垂直：0=包围盒顶, 1=底
   无 a3d 时回退到旧 2D 坐标的 inset 映射。 */
const MAP = { x1: .075, x2: .95, y1: .14, y2: .82 };
function anchorForPart(model, part, box) {
  const a = new THREE.Object3D();
  const size = box.getSize(new THREE.Vector3());   // 世界 AABB（含缩放）
  let tx, ty;
  if (part.a3d) { tx = part.a3d[0]; ty = part.a3d[1]; }
  else {
    tx = MAP.x1 + part.x * (MAP.x2 - MAP.x1);
    ty = MAP.y1 + part.y * (MAP.y2 - MAP.y1);
  }
  // 目标世界坐标 → 锚点是 model 子级（继承 scale），换回本地空间
  const flipX = !!(MODEL_CONFIG[model.userData.wid] && MODEL_CONFIG[model.userData.wid].flipX);
  const wx = flipX ? box.min.x + tx * size.x : box.max.x - tx * size.x;
  const wy = box.max.y - ty * size.y;
  a.position.set(
    (wx - model.position.x) / model.scale.x,
    (wy - model.position.y) / model.scale.y,
    0
  );
  model.add(a);
  return a;
}

/* ---------------- 相机聚焦 tween ---------------- */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function cameraTween(toPos, toTarget, ms = 560) {
  tween = {
    t0: performance.now(), ms,
    fromPos: camera.position.clone(), toPos: toPos.clone(),
    fromTar: controls.target.clone(), toTar: toTarget.clone()
  };
}
function updateTween() {
  if (!tween) return;
  const p = Math.min(1, (performance.now() - tween.t0) / tween.ms);
  const e = easeOutCubic(p);
  camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
  controls.target.lerpVectors(tween.fromTar, tween.toTar, e);
  if (p >= 1) tween = null;
}

function focusPart(i) {
  if (!anchors[i] || !current) return;
  const wp = new THREE.Vector3();
  anchors[i].getWorldPosition(wp);
  // 保持当前方位角，沿球面推近
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = THREE.MathUtils.lerp(camera.position.distanceTo(controls.target), 3.6, 0.7);
  cameraTween(wp.clone().add(dir.multiplyScalar(dist)), wp);
}
function resetView(cfg) {
  cameraTween(
    new THREE.Vector3(cfg.camera[0], cfg.camera[1], cfg.camera[2]),
    new THREE.Vector3(0, cfg.targetY, 0)
  );
}

/* ---------------- 指针：点击部件 / 取消自动旋转 ---------------- */
function bindPointer() {
  const el = renderer.domElement;
  let downX = 0, downY = 0;
  el.addEventListener('pointerdown', e => {
    downX = e.clientX; downY = e.clientY;
    if (!autoCancelled) { autoCancelled = true; controls.autoRotate = false; }
  });
  el.addEventListener('pointerup', e => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return; // 拖拽不算点击
    const hit = pickPart(e.clientX, e.clientY);
    if (hit != null && onSelectCb) onSelectCb(hit);
  });
}

function pickPart(clientX, clientY) {
  if (!current || !anchors.length) return null;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(meshList, false);
  if (!hits.length) { onSelectCb && onSelectCb(-1); return null; }
  // 命中点 → 模型本地坐标，与锚点比距离
  const local = current.worldToLocal(hits[0].point.clone());
  let best = -1, bd = Infinity;
  anchors.forEach((a, i) => {
    const d = a.position.distanceTo(local);
    if (d < bd) { bd = d; best = i; }
  });
  const cfg = MODEL_CONFIG[current.userData.wid];
  const threshold = cfg.length * 0.11;
  return bd <= threshold ? best : null;
}

/* ---------------- 主循环 ---------------- */
function frame() {
  if (!rafOn) return;
  requestAnimationFrame(frame);
  const dt = clock.getDelta();
  updateTween();
  controls.update();
  renderer.render(scene, camera);

  if (current && onFrameCb && anchors.length) {
    const r = renderer.domElement.getBoundingClientRect();
    hotScreens = anchors.map((a) => {
      const v = new THREE.Vector3();
      a.getWorldPosition(v);
      // 锚点在相机背面半球时淡化
      const toAnchor = v.clone().sub(camera.position).normalize();
      const face = camera.getWorldDirection(new THREE.Vector3()).dot(toAnchor) < 0;
      v.project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * r.width,
        y: (-v.y * 0.5 + 0.5) * r.height,
        visible: v.z < 1 && v.z > -1 && !face
      };
    });
    onFrameCb(hotScreens);
  }
}

/* ---------------- 对外接口 ---------------- */
const Viewer3D = {
  init(el) {
    stageEl = el;
    ensureScene();
  },
  open(id, parts, cbs) {
    ensureScene();
    resize();
    onFrameCb = cbs && cbs.onFrame;
    onSelectCb = cbs && cbs.onSelect;
    anchors = [];
    hotScreens = [];
    if (current) { scene.remove(current); current = null; }
    stageEl.classList.add('loading');
    stageEl.classList.remove('failed');

    return getTemplate(id).then(tpl => {
      const cfg = MODEL_CONFIG[id];
      const model = tpl.clone(true);
      model.userData.wid = id;
      current = model;
      scene.add(model);

      const box = new THREE.Box3().setFromObject(model);
      anchors = (parts || []).map(p => anchorForPart(model, p, box));
      meshList = [];
      model.traverse(o => { if (o.isMesh) meshList.push(o); });

      // 相机落位
      camera.position.set(cfg.camera[0], cfg.camera[1], cfg.camera[2]);
      controls.target.set(0, cfg.targetY, 0);
      controls.update();
      autoCancelled = !!reduceMotion;
      controls.autoRotate = !reduceMotion && !!cfg.autoRotate;
      controls.autoRotateSpeed = cfg.autoRotate || 0;

      stageEl.classList.remove('loading');
      rafOn = true;
      requestAnimationFrame(frame);
      return true;
    }).catch(err => {
      stageEl.classList.remove('loading');
      stageEl.classList.add('failed');
      if (cbs && cbs.onError) cbs.onError(err);
      return false;
    });
  },
  focus(i) { focusPart(i); },
  reset() { if (current) resetView(MODEL_CONFIG[current.userData.wid]); },
  setAuto(on) { controls.autoRotate = !!on; },
  close() {
    rafOn = false;
    if (current) { scene.remove(current); current = null; }
    anchors = [];
    onFrameCb = null; onSelectCb = null;
  }
};

window.Viewer3D = Viewer3D;
