import * as THREE from "three";
import { SceneCreator } from "../../../src/main";

const container = document.getElementById("scene") as HTMLElement;

const scene = new SceneCreator(
  container,
  1,
  new THREE.Vector3(9, 7, 13),
  new THREE.Vector3(0, 1.5, 0)
);

scene
  .addLighting({
    hemisphere: { sky: 0xc7d2ff, ground: 0x14101f, intensity: 1.1 },
    key: { color: 0xffffff, intensity: 2.9, position: new THREE.Vector3(7, 16, 9) },
    fill: { color: 0x8b5cf6, intensity: 0.8, position: new THREE.Vector3(-9, 6, -7) },
    shadows: true,
    shadowArea: 16,
    shadowMapSize: 2048,
    toneMapping: true,
  })
  .addControls({
    enableDamping: true,
    dampingFactor: 0.06,
    minDistance: 6,
    maxDistance: 28,
    maxPolarAngle: Math.PI / 2 - 0.04,
  });

scene.scene.background = new THREE.Color(0x0a0a12);
scene.scene.fog = new THREE.Fog(0x0a0a12, 22, 48);

// Visual ground (the physics ground plane lives at y = 0 too).
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(22, 64),
  new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.scene.add(ground);

const grid = new THREE.GridHelper(44, 44, 0x6366f1, 0x1d1d2e);
(grid.material as THREE.Material).opacity = 0.12;
(grid.material as THREE.Material).transparent = true;
scene.scene.add(grid);

// --- Physics ---
// enablePhysics loads cannon-es on demand, so await it before adding bodies.
await scene.enablePhysics({ gravity: [0, -12, 0], restitution: 0.35, friction: 0.4 });
scene.addGround(0);

const ACCENTS = [0x6366f1, 0x22d3ee, 0xa78bfa, 0xf472b6, 0xfbbf24, 0x38bdf8];
const spawned: { mesh: THREE.Mesh; body: ReturnType<typeof scene.addBody> }[] = [];
const MAX = 90;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const countEl = document.getElementById("count")!;
const updateCount = () => (countEl.textContent = String(spawned.length));

function spawnOne() {
  if (spawned.length >= MAX) return;

  const color = pick(ACCENTS);
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.4 });

  let mesh: THREE.Mesh;
  let shape: "box" | "sphere";
  if (Math.random() < 0.5) {
    const s = rand(0.8, 1.4);
    mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), material);
    shape = "box";
  } else {
    const r = rand(0.5, 0.85);
    mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), material);
    shape = "sphere";
  }

  mesh.position.set(rand(-2.5, 2.5), rand(9, 13), rand(-2.5, 2.5));
  mesh.quaternion.setFromEuler(new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.scene.add(mesh);

  const body = scene.addBody(mesh, { mass: 1, shape });
  spawned.push({ mesh, body });
  updateCount();
}

function dropBurst(n: number, stagger = 70) {
  for (let i = 0; i < n; i++) setTimeout(spawnOne, i * stagger);
}

function reset() {
  for (const { mesh, body } of spawned) {
    scene.removeBody(body);
    scene.scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  spawned.length = 0;
  updateCount();
}

document.getElementById("drop")!.addEventListener("click", () => dropBurst(8));
document.getElementById("reset")!.addEventListener("click", () => {
  reset();
  dropBurst(10);
});

// Initial cascade.
dropBurst(14);
