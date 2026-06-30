# 3D Scene Creator

A tiny, type-safe toolkit for building interactive 3D scenes on top of Three.js:
lighting, controls, model loading, animation, physics and click-to-pick, behind
a fluent API.

**[Live demo &amp; examples](https://3dscenecreator.netlify.app)** ·
**[API reference](https://3dscenecreator.netlify.app/docs.html)**

## Features
- 🎬 The SceneCreator class wraps Three.js and tween.js to provide a simple API to load models, animate objects, and setup 3D scenes
- ⚡ **Optimized render function**: only renders when something is moving
- 🎯 **Type-safe API**: Full TypeScript support with JSDoc documentation
- 🔧 **Method chaining**: All methods return `this` for fluent API
- 🎨 **Easy animations**: Color, opacity, position, and camera animations
- 🎮 **Camera controls**: Built-in OrbitControls with customizable settings
- 💡 **Configurable lighting rig**: Hemisphere + key/fill directional lights, soft shadows, and ACES tone mapping out of the box
- 📦 **glTF/GLB loading with caching**: Load once, clone many: ideal for instancing buildings, units, and props
- 🌅 **360° Skybox support**: Load panoramic images as backgrounds
- 💾 **Resource cleanup**: Automatic memory management with `dispose()` method
- 🎯 **Interactive mesh picking**: Click, hover, and right-click detection on 3D objects, with click-vs-drag discrimination on mouse and touch
- 🧲 **Rigid-body physics**: Optional cannon-es integration: gravity, ground planes, and mesh-linked bodies stepped and synced automatically


## Usage
### Install

`three` is a **peer dependency** (`>=0.145.0`), so install it alongside the package:

```bash
npm install 3d-scene-creator three
```

The package ships both ESM (`import`) and UMD (`require`) builds with bundled TypeScript types.

### Quick Start

```js
import { SceneCreator } from "3d-scene-creator";
import * as THREE from "three";

// Create a container
const container = document.createElement('div');
container.style.height = '100vh';
container.style.width = '100%';
document.body.appendChild(container);

// Create scene
const scene = new SceneCreator(container);

// Setup scene with lighting and controls
scene.addLighting().addControls().addSkybox();

console.log("Scene ready!");
```

### Complete Example with Model Loading

```js
import { SceneCreator } from "3d-scene-creator";
import * as THREE from "three";

const container = document.getElementById('canvas-container');
const scene = new SceneCreator(container, 1, new THREE.Vector3(15, 15, 15));

// Setup scene
scene
  .addLighting()
  .addControls()
  .addSkybox("https://example.com/360-image.jpg");

// Load and animate a model
try {
  const model = await scene.loadModel("/models/my-model.json");
  model.name = "MyObject";
  
  // Chain animations
  scene
    .animateModelColor("MyObject", "#ff0000", 2)
    .animateModelPosition("MyObject", new THREE.Vector3(5, 0, 0), 3)
    .animateModelOpacity("MyObject", 0.7, 2);
} catch (error) {
  console.error("Failed to load model:", error);
}

// Move camera with callback
scene.moveCamera(
  new THREE.Vector3(20, 20, 20),
  new THREE.Vector3(0, 0, 0),
  () => console.log("Camera animation complete!")
);

// Cleanup when done
window.addEventListener('beforeunload', () => {
  scene.dispose();
});
```

### Loading 3D Models

```js
// Load with default ObjectLoader (adds the object to the scene)
await scene.loadModel("/path/to/model.json");

// Load with custom loader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const gltfLoader = new GLTFLoader();
await scene.loadModel("/path/to/model.glb", gltfLoader);
```

#### glTF/GLB with caching

`loadGLTF()` uses a built-in `GLTFLoader` and caches each URL, so loading the
same asset many times only fetches and parses it once. It returns a fresh
**clone** that is *not* added to the scene, so position it and add it yourself.
Perfect for instancing buildings, units, or props in a game.

```js
// Fetch + parse once; every call returns an independent clone
const tree1 = await scene.loadGLTF("/models/tree.glb");
const tree2 = await scene.loadGLTF("/models/tree.glb"); // served from cache

tree1.position.set(0, 0, 0);
tree2.position.set(5, 0, 2);
scene.scene.add(tree1, tree2);

scene.applyShadows(); // make the new meshes cast/receive shadows
```

#### Animated models

`loadAnimatedModel()` loads a rigged glTF, adds it to the scene, applies
shadows, builds an `AnimationMixer` and wires it into the render loop (which
keeps drawing while a clip is playing). It returns a small handle for driving
playback. `play()` cross-fades between clips. Unlike `loadGLTF()` it keeps the
original object (not a clone), so the skeleton animates correctly.

```js
const robot = await scene.loadAnimatedModel("/models/robot.glb", {
  autoplay: "Idle", // first clip by default; pass false to start paused
});

console.log(robot.names);          // every available clip name
robot.play("Walking");             // cross-fade to a looping clip
robot.play("Wave", { loop: false }); // play once, hold the final frame
robot.stop();                      // fade the current clip out
```

You can also register your own mixer if you load a model manually:

```js
const mixer = new THREE.AnimationMixer(myModel);
scene.addMixer(mixer); // advanced automatically every frame
```

### Camera Controls

```js
// Add orbit controls with default settings
scene.addControls();

// Add with custom configuration
scene.addControls({
  enableDamping: true,
  dampingFactor: 0.05,
  maxDistance: 100,
  minDistance: 5
});

// Animate camera
scene.moveCamera(
  new THREE.Vector3(10, 20, 20),
  new THREE.Vector3(0, 5, 0)
);

// Reset to initial position
scene.resetCameraPosition();
```

### Lighting & Shadows

`addLighting()` sets up a game-ready rig: a hemisphere fill, a shadow-casting key
light, an opposite fill light, and ACES Filmic tone mapping. Everything has
sensible defaults and is fully configurable.

```js
// Recommended default rig (shadows + tone mapping enabled)
scene.addLighting();

// Fully customized rig
scene.addLighting({
  hemisphere: { sky: 0xbcd4ff, ground: 0x3a2c16, intensity: 1.4 },
  key: { color: 0xfff2dd, intensity: 2.6, position: new THREE.Vector3(8, 16, 10) },
  fill: { color: 0x9ec3ff, intensity: 0.6, position: new THREE.Vector3(-10, 8, -8) },
  shadows: true,
  shadowArea: 16,      // half-size of the key light's shadow frustum
  shadowMapSize: 2048, // shadow map resolution
  toneMapping: true,
  exposure: 1.05,
});

// Disable individual lights or features
scene.addLighting({ hemisphere: false, fill: false, shadows: false });
```

Shadows only appear on meshes that opt in. After adding your meshes, call
`applyShadows()` to flag every mesh in the scene as a shadow caster/receiver:

```js
scene.addLighting();
// ...add your meshes...
scene.applyShadows();          // cast + receive on all meshes
scene.applyShadows(true, false); // cast only (e.g. units that don't catch shadows)
```

> **Note:** `addLighting()` adds lights without clearing existing ones, so call it once per scene.

### Skybox / Background

```js
// Add skybox from 360° image
scene.addSkybox("https://example.com/panorama.jpg");

// Add colored skybox
scene.addSkybox(undefined, "#87CEEB"); // Sky blue

// Custom named skybox
scene.addSkybox("image.jpg", "#000000", "my-skybox");
```

### Animate Objects

```js
const obj = await scene.loadModel("/model.json");
obj.name = "Character";

// Animate color
scene.animateModelColor("Character", "red", 2);

// Animate position
scene.animateModelPosition(
  "Character", 
  new THREE.Vector3(-5, 2, 10), 
  3
);

// Animate opacity
scene.animateModelOpacity("Character", 0.5, 2);
```

### Interactive Object Picking

`enablePicking()` wires up click, hover, enter/leave and right-click detection.
Every callback receives a typed **`PickEvent`** — `{ object, intersection,
originalEvent }` — so you get the picked object **by reference**, the full
Three.js raycast intersection (point, face, distance, uv, instanceId…) and the
DOM event that triggered it. No need to identify objects by `name`.

```ts
import { SceneCreator } from "3d-scene-creator";
import * as THREE from "three";

const scene = new SceneCreator(container);
scene.addLighting().addControls();

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0xff6b6b })
);
cube.userData.pickable = true; // tag it however you like
scene.scene.add(cube);

scene.enablePicking({
  // Only consider objects you opt in — by data, not by name.
  filter: (o) => o.userData.pickable === true,

  onClick: ({ object, intersection, originalEvent }) => {
    console.log("clicked", object, "at", intersection.point, originalEvent);
    if (object instanceof THREE.Mesh) object.material.color.set(Math.random() * 0xffffff);
  },

  // Fires once when the pointer moves onto an object…
  onEnter: ({ object }) => {
    if (object instanceof THREE.Mesh) object.material.emissive.setHex(0x333333);
  },
  // …and once when it leaves it.
  onLeave: (object) => {
    if (object instanceof THREE.Mesh) object.material.emissive.setHex(0x000000);
  },

  // Fires whenever the hovered object changes (the object, or null).
  onHover: (e) => {
    container.style.cursor = e ? "pointer" : "default";
  },

  // Right-click (the default browser menu is suppressed while picking is on).
  onContextMenu: ({ object }) => console.log("right-clicked", object),
});
```

**Options**

| Option | Description |
|--------|-------------|
| `onClick` | Left click / tap on an object |
| `onContextMenu` | Right click on an object |
| `onHover` | Hovered object changed (receives the `PickEvent` or `null`) |
| `onEnter` / `onLeave` | Pointer entered / left an object (transitions, tracked by reference) |
| `recursive` | Recurse into children when raycasting (default `true`) |
| `filter` | Predicate; only objects for which it returns true are pickable |

`enablePicking()` adds the DOM listeners; **`disablePicking()` removes them**
(and so does `dispose()`), so toggling picking on and off never leaks handlers.
Calling `enablePicking()` again replaces the previous session cleanly.

```js
scene.enablePicking({ onClick: (e) => console.log(e.object) });
scene.disablePicking(); // every listener is detached
```

Click and tap events only fire when the pointer barely moves between press and
release, so orbiting or panning never triggers a spurious click. Tune the
sensitivity (in pixels) via `clickDragThreshold` (default `6`):

```js
scene.clickDragThreshold = 10;
```

You can also query/pick imperatively:

```js
// Currently hovered object
const selected = scene.getSelectedObject();

// Pick at specific normalized coordinates (-1 to 1)
const result = scene.pickAt(-0.5, 0.2);
if (result) {
  console.log(result.object, result.distance, result.point);
}
```

> **Backward compatible:** the older positional form
> `enablePicking(onClick, onHover, onContextMenu)` — where each callback
> receives just the object — still works.

### Physics

Opt into rigid-body physics with [cannon-es](https://github.com/pmndrs/cannon-es)
(MIT). `enablePhysics()` loads cannon-es on demand (a dynamic `import()`), so
it's `async`: `await` it once, then link any mesh to a body with `addBody()`.
The world is stepped every frame and each body's position and rotation are
copied back onto its mesh automatically.

```js
scene.addLighting().addControls();

// Turn on physics and drop in a ground plane.
await scene.enablePhysics({ gravity: [0, -12, 0], restitution: 0.4 });
scene.addGround(0); // static, infinite plane at y = 0

// Any mesh can become a dynamic body. The collision shape is derived from
// the mesh's bounding box (or sphere) and its scale.
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x6366f1 })
);
box.position.set(0, 8, 0);
box.castShadow = true;
scene.scene.add(box);

const body = scene.addBody(box, { mass: 1, shape: "box" });
// ...the box now falls and rests on the ground, mesh kept in sync each frame.

scene.removeBody(body); // detach when you're done with it
```

Use `mass: 0` for static bodies, and `shape: "sphere"` for rolling objects.
The underlying `CANNON.World` is exposed as `scene.physicsWorld` if you need to
add constraints, custom materials, or collision events. Because cannon-es is
imported lazily, bundlers code-split it into its own chunk, so apps that never
call `enablePhysics()` don't load it.

### Resource Cleanup

Always call `dispose()` when done to prevent memory leaks:

```js
scene.dispose(); // Stops rendering, clears scene, disposes renderer
```

## API Reference

### SceneCreator Class

#### Constructor

```typescript
constructor(
  container?: HTMLElement,
  scale?: number,
  camPos?: THREE.Vector3,
  targetPos?: THREE.Vector3
)
```

#### Methods

**Core Methods**
- `attachRenderer(container: HTMLElement): this` - Attach renderer to DOM
- `loadModel(url: string, loader?: THREE.Loader): Promise<Object3D>` - Load a 3D model and add it to the scene
- `loadGLTF(url: string): Promise<Group>` - Load a glTF/GLB model and return a cached, cloneable Group (not added to the scene)
- `loadAnimatedModel(url: string, options?: AnimatedModelOptions): Promise<AnimatedModel>` - Load a rigged glTF, add it to the scene, and wire its animation clips into the render loop; returns a playback handle
- `addMixer(mixer: THREE.AnimationMixer): this` / `removeMixer(mixer): this` - Register/unregister an AnimationMixer driven automatically each frame
- `dispose(): void` - Clean up resources

**Lighting & Scene Setup**
- `addLighting(options?: LightingOptions): this` - Add a configurable lighting rig (hemisphere + key/fill lights, shadows, tone mapping)
- `applyShadows(cast?: boolean, receive?: boolean): this` - Toggle shadow casting/receiving on all meshes in the scene
- `addSkybox(url?: string, color?: ColorRepresentation, name?: string): this` - Add skybox
- `addControls(overrides?: object): this` - Add orbit controls

**Camera**
- `moveCamera(position: Vector3, target?: Vector3, callback?: Function): this` - Animate camera
- `resetCameraPosition(): this` - Reset to initial position

**Animations**
- `animateModelColor(name: string, color: string|number, duration?: number): this`
- `animateModelPosition(name: string, position: Vector3, duration?: number): this`
- `animateModelOpacity(name: string, value: number, duration?: number): this`

**Interactive Picking**
- `enablePicking(options?: PickingOptions): this` - Enable object picking. Callbacks (`onClick`, `onContextMenu`, `onHover`, `onEnter`, `onLeave`) receive a typed `PickEvent` (`{ object, intersection, originalEvent }`); `filter` and `recursive` tune which objects are hit. Adds the DOM listeners.
- `enablePicking(onClick?, onHover?, onContextMenu?): this` - Legacy positional form (each callback receives just the object); kept for backward compatibility
- `disablePicking(): this` - Disable picking and remove all its event listeners
- `getSelectedObject(): Object3D | null` - Get currently hovered object
- `pickAt(mouseX: number, mouseY: number): PickingResult | null` - Pick object at normalized mouse coordinates

**Physics**
- `enablePhysics(options?: PhysicsOptions): Promise<this>` - Load cannon-es on demand and create the world (gravity, default friction/restitution). `await` before adding bodies
- `addBody(mesh: Object3D, options?: PhysicsBodyOptions): CANNON.Body` - Link a mesh to a rigid body, synced every frame
- `addGround(y?: number): CANNON.Body` - Add a static, infinite ground plane
- `removeBody(body: CANNON.Body): this` - Remove a body and stop syncing its mesh
- `physicsWorld?: CANNON.World` - The underlying world (for constraints, materials, events)

**Rendering**
- `startRenderLoop(): this` - Start rendering
- `stopRenderLoop(): this` - Stop rendering
- `setAdditionalRenderFn(fn: () => void): this` - Add custom render callback

## Architecture

`SceneCreator` is a thin, fluent **facade**. It owns no rendering logic of its
own: it wires together a set of small, single-responsibility managers and
delegates to them. This keeps each concern isolated and testable while
preserving the simple chainable API: `new SceneCreator(container).addLighting().addControls()`.

```
src/
├── classes/
│   └── SceneCreator.ts      # Public facade: wires managers, delegates, exposes the API
├── core/
│   ├── SceneContext.ts      # Shared Three.js primitives (scene, renderer, camera, scale, container)
│   ├── RenderLoop.ts        # requestAnimationFrame loop + "render only when something moved"
│   └── RendererManager.ts   # Renderer/canvas lifecycle: attach, sizing, resize, teardown
├── managers/
│   ├── CameraManager.ts     # Camera creation + scripted moves (moveCamera / resetCameraPosition)
│   ├── ControlsManager.ts   # OrbitControls
│   ├── LightingManager.ts   # Lighting rig, shadows, tone mapping
│   ├── AssetLoader.ts       # loadModel / loadGLTF + per-URL cache + shared GLTFLoader
│   ├── AnimationManager.ts  # Tweens, mixers, animateModel*, loadAnimatedModel
│   ├── PickingManager.ts    # Raycasting, pointer/touch listeners, click-vs-drag
│   ├── PhysicsManager.ts    # Optional cannon-es world, bodies, per-frame sync
│   └── EnvironmentManager.ts# Skybox / background
└── types.ts                 # Public type definitions
```

### How it fits together

Managers depend only on two shared pieces, never on each other's internals:

- **`SceneContext`**: the bag of Three.js objects (`scene`, `renderer`,
  `camera`, `scale`, `container`) that every manager reads from. `camera` is
  created by `CameraManager` and `container` by `RendererManager`, then
  published on the context for the others.
- **`RenderLoop`**: a single shared loop. Subsystems plug in instead of
  running their own:
  - `onBeforeRender(fn)`: advance state each frame (tweens, mixers, physics step).
  - `onAfterRender(fn)`: run after the draw decision (e.g. `controls.update()`).
  - `addActivitySource(fn)`: report "something is still moving", which forces a
    draw even when the camera is stationary. This is what powers the
    render-only-when-needed optimization.

The few cross-manager links (for example, a camera move needs to disable the
controls) are passed as lazy accessor functions, so there are no construction-
order or circular-dependency problems.

### Disposal

Each manager owns the teardown of what it created and exposes a `dispose()`.
`SceneCreator.dispose()` simply coordinates them in order: stopping the loop,
clearing tweens/mixers, dropping physics bodies, **removing the picking DOM
listeners**, disposing lights/skybox/controls, and finally disposing the
renderer and clearing the scene.

### Extending

To add a new capability, create a manager that takes the `SceneContext` (and the
`RenderLoop` if it needs per-frame work), register any tick / activity sources,
and add a thin delegating method on `SceneCreator`. You generally won't need to
touch the existing managers.

