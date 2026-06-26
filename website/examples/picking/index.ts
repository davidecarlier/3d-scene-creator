import * as THREE from "three";
import { SceneCreator } from "../../../src/main";

const container = document.getElementById("scene") as HTMLElement;

const scene = new SceneCreator(
  container,
  1,
  new THREE.Vector3(0, 5, 12),
  new THREE.Vector3(0, 1.2, 0)
);

scene
  .addLighting({
    hemisphere: { sky: 0xc7d2ff, ground: 0x14101f, intensity: 1.1 },
    key: { color: 0xffffff, intensity: 2.8, position: new THREE.Vector3(6, 14, 8) },
    fill: { color: 0x8b5cf6, intensity: 0.8, position: new THREE.Vector3(-8, 5, -6) },
    shadows: true,
    shadowArea: 12,
    toneMapping: true,
  })
  .addControls({
    enableDamping: true,
    dampingFactor: 0.06,
    minDistance: 6,
    maxDistance: 22,
    maxPolarAngle: Math.PI / 2 - 0.04,
  });

scene.scene.background = new THREE.Color(0x0a0a12);
scene.scene.fog = new THREE.Fog(0x0a0a12, 18, 40);

// Ground that catches contact shadows.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(20, 64),
  new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.scene.add(ground);

const grid = new THREE.GridHelper(40, 40, 0x6366f1, 0x1d1d2e);
(grid.material as THREE.Material).opacity = 0.12;
(grid.material as THREE.Material).transparent = true;
scene.scene.add(grid);

// --- Interactive shapes ---
const ACCENTS = [0x6366f1, 0x22d3ee, 0xa78bfa, 0xf472b6, 0xfbbf24];

interface Shape {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  baseY: number;
  phase: number;
  targetScale: number;
  hopY: number;
  vy: number;
  color: number;
}

const geometries: THREE.BufferGeometry[] = [
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.TorusKnotGeometry(0.6, 0.22, 120, 16),
  new THREE.DodecahedronGeometry(1, 0),
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.ConeGeometry(1, 1.8, 5),
];
const names = ["Icosahedron", "Knot", "Dodecahedron", "Cube", "Prism"];

const shapes: Shape[] = [];
const count = geometries.length;

geometries.forEach((geom, i) => {
  const color = ACCENTS[i % ACCENTS.length];
  const mesh = new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.35 })
  );
  const x = (i - (count - 1) / 2) * 2.8;
  mesh.position.set(x, 1.4, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = names[i];
  scene.scene.add(mesh);

  shapes.push({ mesh, baseY: 1.4, phase: i * 1.4, targetScale: 1, hopY: 0, vy: 0, color });
});

const byMesh = (obj: THREE.Object3D) => shapes.find((s) => s.mesh === obj);
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

// --- Readout panel ---
let clicks = 0;
let rclicks = 0;
const $ = (id: string) => document.getElementById(id)!;

function showHover(shape: Shape | null) {
  const readout = $("readout");
  if (shape) {
    readout.classList.remove("idle");
    $("name").textContent = shape.mesh.name;
    ($("swatch") as HTMLElement).style.background = hex(shape.color);
    const dist = scene.camera.position.distanceTo(shape.mesh.position);
    $("dist").textContent = `${dist.toFixed(1)}m`;
  } else {
    readout.classList.add("idle");
    $("name").textContent = "nothing selected";
    ($("swatch") as HTMLElement).style.background = "#444";
    $("dist").textContent = "-";
  }
}

// --- Picking ---
let hovered: Shape | null = null;

scene.enablePicking(
  // Click → recolour
  (object) => {
    const shape = byMesh(object);
    if (!shape) return;
    clicks++;
    $("clicks").textContent = String(clicks);
    const next = ACCENTS[Math.floor((ACCENTS.indexOf(shape.color) + 1) % ACCENTS.length)];
    shape.color = next;
    scene.animateModelColor(shape.mesh.name, hex(next), 0.5);
    shape.targetScale = 1.4; // pop, eased back in the render loop
    if (hovered === shape) showHover(shape);
  },
  // Hover → highlight & inspect
  (object) => {
    if (hovered) {
      hovered.mesh.material.emissive.setHex(0x000000);
      hovered.targetScale = 1;
    }
    hovered = object ? byMesh(object) ?? null : null;
    if (hovered) {
      hovered.mesh.material.emissive.copy(hovered.mesh.material.color).multiplyScalar(0.45);
      hovered.targetScale = 1.16;
    }
    container.style.cursor = hovered ? "pointer" : "grab";
    showHover(hovered);
  },
  // Right-click → hop
  (object) => {
    const shape = byMesh(object);
    if (!shape) return;
    rclicks++;
    $("rclicks").textContent = String(rclicks);
    shape.vy = 0.34;
  }
);

// --- Per-frame motion: idle float, scale easing, and hop physics ---
let t = 0;
scene.setAdditionalRenderFn(() => {
  t += 0.01;
  for (const s of shapes) {
    s.vy -= 0.022;
    s.hopY = Math.max(0, s.hopY + s.vy);
    if (s.hopY === 0 && s.vy < 0) s.vy = 0;

    s.mesh.position.y = s.baseY + Math.sin(t + s.phase) * 0.18 + s.hopY;
    s.mesh.rotation.x += 0.004;
    s.mesh.rotation.y += 0.006;

    const cur = s.mesh.scale.x;
    s.mesh.scale.setScalar(cur + (s.targetScale - cur) * 0.14);
    // After a click pop, settle back toward the hover/idle scale.
    if (s.targetScale > 1.2) s.targetScale += (1.16 - s.targetScale) * 0.1;
  }
});

container.style.cursor = "grab";
