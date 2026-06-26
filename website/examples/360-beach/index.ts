import * as THREE from "three";
import { SceneCreator } from "../../../src/main";

const PANORAMA = "kris-guico-rsB-he-ye7w-unsplash.jpg";

const container = document.getElementById("scene") as HTMLElement;

// Camera sits near the centre of the panoramic sphere and orbits in place,
// so dragging feels like looking around from a fixed viewpoint.
const scene = new SceneCreator(
  container,
  1,
  new THREE.Vector3(0, 1.5, 6),
  new THREE.Vector3(0, 1.5, 0)
);

scene
  .addSkybox(PANORAMA)
  .addLighting({ shadows: false })
  .addControls({
    enableDamping: true,
    dampingFactor: 0.05,
    enablePan: false,
    minDistance: 0.5,
    maxDistance: 9,
    rotateSpeed: -0.35, // drag in the same direction you want to look
    autoRotate: true,
    autoRotateSpeed: 0.4,
  });

// Preload the image so the loader hides only once the view is actually ready.
const img = new Image();
img.onload = () => document.getElementById("loader")!.classList.add("hidden");
img.onerror = () => {
  const text = document.querySelector(".loader-text");
  if (text) text.textContent = "Couldn't load the panorama.";
};
img.src = PANORAMA;

// --- Controls wiring ---
const autoBtn = document.getElementById("autorotate") as HTMLButtonElement;
autoBtn.addEventListener("click", () => {
  if (!scene.controls) return;
  scene.controls.autoRotate = !scene.controls.autoRotate;
  autoBtn.classList.toggle("active", scene.controls.autoRotate);
});

document.getElementById("reset")!.addEventListener("click", () => {
  scene.resetCameraPosition();
});

// Pause auto-rotation while the user is actively dragging.
container.addEventListener("pointerdown", () => {
  if (scene.controls?.autoRotate) {
    scene.controls.autoRotate = false;
    autoBtn.classList.remove("active");
  }
});
