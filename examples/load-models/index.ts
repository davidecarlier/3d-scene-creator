import * as THREE from "three";
import { SceneCreator } from "../../src/main";

// A rigged, animated glTF model served from a CDN (CC-licensed three.js asset).
const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/models/gltf/RobotExpressive/RobotExpressive.glb";

const container = document.getElementById("scene") as HTMLElement;

// --- Scene: SceneCreator handles the renderer, lighting, controls & camera ---
const scene = new SceneCreator(
  container,
  1,
  new THREE.Vector3(6, 4.5, 9),
  new THREE.Vector3(0, 1.6, 0)
);

scene
  .addLighting({
    hemisphere: { sky: 0xc7d2ff, ground: 0x14101f, intensity: 1.1 },
    key: { color: 0xffffff, intensity: 3, position: new THREE.Vector3(6, 14, 8) },
    fill: { color: 0x8b5cf6, intensity: 0.9, position: new THREE.Vector3(-8, 5, -6) },
    shadows: true,
    shadowArea: 12,
    shadowMapSize: 2048,
    toneMapping: true,
    exposure: 1.05,
  })
  .addControls({
    enableDamping: true,
    dampingFactor: 0.06,
    minDistance: 4,
    maxDistance: 20,
    maxPolarAngle: Math.PI / 2 - 0.04,
  });

// Dark, foggy backdrop for depth, keeps the robot the focus.
scene.scene.background = new THREE.Color(0x0a0a12);
scene.scene.fog = new THREE.Fog(0x0a0a12, 16, 34);

// Soft ground that catches the robot's shadow.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(18, 64),
  new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.95, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.scene.add(ground);

// A faint accent grid for a bit of "stage" character.
const grid = new THREE.GridHelper(36, 36, 0x6366f1, 0x1d1d2e);
(grid.material as THREE.Material).opacity = 0.12;
(grid.material as THREE.Material).transparent = true;
scene.scene.add(grid);

// Looping movements vs. one-shot emotes (return to the movement afterwards).
const STATES = ["Idle", "Walking", "Running", "Dance", "Sitting", "Standing"];
const EMOTES = ["Jump", "Yes", "No", "Wave", "Punch", "ThumbsUp"];

function setActiveChip(groupId: string, name: string) {
  document
    .querySelectorAll(`#${groupId} .chip`)
    .forEach((el) => el.classList.toggle("active", el.getAttribute("data-anim") === name));
}

function makeChip(group: string, name: string, label: string, onClick: () => void) {
  const el = document.createElement("button");
  el.className = "chip";
  el.textContent = label;
  el.setAttribute("data-anim", name);
  el.addEventListener("click", onClick);
  document.getElementById(group)!.appendChild(el);
}

// --- Load the animated model through the library ---
// loadAnimatedModel adds it to the scene, applies shadows, builds the mixer and
// wires it into the render loop. We just drive playback via the returned handle.
let robot: Awaited<ReturnType<typeof scene.loadAnimatedModel>>;
try {
  robot = await scene.loadAnimatedModel(MODEL_URL, { autoplay: "Idle" });
} catch (err) {
  console.error("Failed to load model:", err);
  const text = document.querySelector(".loader-text");
  if (text) text.textContent = "Couldn't load the model. Check your connection.";
  throw err;
}

let baseState = "Idle"; // looping movement to fall back to after an emote
const face = robot.model.getObjectByName("Head_4") as THREE.Mesh | undefined;

function playState(name: string) {
  baseState = name;
  robot.play(name, { fade: 0.35 });
  setActiveChip("states", name);
  setActiveChip("emotes", "");
}

function playEmote(name: string) {
  setActiveChip("emotes", name);
  robot.play(name, { fade: 0.18, loop: false });

  const restore = () => {
    robot.mixer.removeEventListener("finished", restore);
    setActiveChip("emotes", "");
    robot.play(baseState, { fade: 0.25 });
  };
  robot.mixer.addEventListener("finished", restore);
}

function setExpression(name: string) {
  if (!face?.morphTargetDictionary || !face.morphTargetInfluences) return;
  const dict = face.morphTargetDictionary;
  Object.keys(dict).forEach((key) => {
    face.morphTargetInfluences![dict[key]] = key === name ? 1 : 0;
  });
  setActiveChip("expressions", name);
}

// Build the controls from whatever clips the model actually ships with.
STATES.filter((s) => robot.actions[s]).forEach((s) =>
  makeChip("states", s, s, () => playState(s))
);
EMOTES.filter((e) => robot.actions[e]).forEach((e) =>
  makeChip("emotes", e, e, () => playEmote(e))
);
if (face?.morphTargetDictionary) {
  makeChip("expressions", "Neutral", "Neutral", () => setExpression("Neutral"));
  Object.keys(face.morphTargetDictionary).forEach((name) =>
    makeChip("expressions", name, name, () => setExpression(name))
  );
  setExpression("Neutral");
}
setActiveChip("states", "Idle");

// A gentle establishing camera move once everything is ready.
scene.moveCamera(new THREE.Vector3(5, 3.4, 8), new THREE.Vector3(0, 1.6, 0));

document.getElementById("loader")!.classList.add("hidden");
