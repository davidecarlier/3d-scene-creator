// Live hero demo — powered by the library itself.
// Everything you see drifting in the header is a SceneCreator instance:
// lighting, orbit, and click/hover picking with a few lines of code.
import { SceneCreator } from "./src/main";
import * as THREE from "three";

const container = document.getElementById("hero-canvas") as HTMLElement | null;
if (container) {
  const scene = new SceneCreator(
    container,
    1,
    new THREE.Vector3(6.5, 3.5, 9),
    new THREE.Vector3(0, 0.2, 0)
  );

  scene.addLighting({
    hemisphere: { sky: 0xc7d2ff, ground: 0x1b1630, intensity: 1.3 },
    key: { color: 0xffffff, intensity: 2.4, position: new THREE.Vector3(6, 12, 8) },
    fill: { color: 0x8b5cf6, intensity: 0.8, position: new THREE.Vector3(-8, 4, -6) },
    shadows: false,
    toneMapping: true,
    exposure: 1.05,
  });

  // Camera gently orbits on its own; the visitor can still grab and spin it.
  scene.addControls({
    autoRotate: true,
    autoRotateSpeed: 0.7,
    enableDamping: true,
    dampingFactor: 0.06,
    enableZoom: false,
    enablePan: false,
  });

  const accents = [0x6366f1, 0x22d3ee, 0xa78bfa, 0xf472b6, 0x38bdf8, 0x818cf8];

  const shapes: {
    mesh: THREE.Mesh;
    baseY: number;
    phase: number;
    spin: number;
    targetScale: number;
  }[] = [];

  const geometries = [
    new THREE.IcosahedronGeometry(1.05, 0),
    new THREE.TorusKnotGeometry(0.62, 0.22, 120, 16),
    new THREE.DodecahedronGeometry(0.95, 0),
    new THREE.OctahedronGeometry(1.05, 0),
    new THREE.TorusGeometry(0.75, 0.26, 20, 48),
    new THREE.BoxGeometry(1.3, 1.3, 1.3),
  ];

  const layout = [
    { x: -3.2, y: 0.6, z: 0.4 },
    { x: -1.1, y: -0.9, z: -1.6 },
    { x: 0.4, y: 1.2, z: 1.2 },
    { x: 2.4, y: -0.4, z: -0.6 },
    { x: 3.6, y: 1.0, z: 0.8 },
    { x: 1.0, y: -1.4, z: 2.0 },
  ];

  layout.forEach((pos, i) => {
    const color = accents[i % accents.length];
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.25,
      roughness: 0.35,
      emissive: new THREE.Color(color).multiplyScalar(0.04),
    });
    const mesh = new THREE.Mesh(geometries[i % geometries.length], material);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.name = `shape-${i}`;
    scene.scene.add(mesh);

    shapes.push({
      mesh,
      baseY: pos.y,
      phase: i * 1.3,
      spin: 0.002 + i * 0.0006,
      targetScale: 1,
    });
  });

  let hovered: THREE.Object3D | null = null;

  // Hover to highlight, click to recolor — all through the picking API.
  scene.enablePicking(
    (object: THREE.Object3D) => {
      const next = accents[Math.floor(Math.random() * accents.length)];
      scene.animateModelColor(object.name, `#${next.toString(16).padStart(6, "0")}`, 0.5);
      const found = shapes.find((s) => s.mesh === object);
      if (found) found.targetScale = 1.35;
    },
    (object: THREE.Object3D | null) => {
      if (hovered && hovered instanceof THREE.Mesh) {
        (hovered.material as THREE.MeshStandardMaterial).emissive.multiplyScalar(0.25);
        const prev = shapes.find((s) => s.mesh === hovered);
        if (prev) prev.targetScale = 1;
      }
      hovered = object;
      container.style.cursor = object ? "pointer" : "grab";
      if (object && object instanceof THREE.Mesh) {
        const mat = object.material as THREE.MeshStandardMaterial;
        mat.emissive.copy(mat.color).multiplyScalar(0.45);
        const found = shapes.find((s) => s.mesh === object);
        if (found) found.targetScale = 1.18;
      }
    }
  );

  let t = 0;
  scene.setAdditionalRenderFn(() => {
    t += 0.01;
    shapes.forEach((s) => {
      s.mesh.position.y = s.baseY + Math.sin(t + s.phase) * 0.28;
      s.mesh.rotation.x += s.spin;
      s.mesh.rotation.y += s.spin * 1.4;
      const cur = s.mesh.scale.x;
      const next = cur + (s.targetScale - cur) * 0.12;
      s.mesh.scale.setScalar(next);
    });
  });

  container.style.cursor = "grab";
}
