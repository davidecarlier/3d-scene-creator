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

Enable interactive object selection with mouse click and hover events:

```js
import { SceneCreator } from "3d-scene-creator";
import * as THREE from "three";

const scene = new SceneCreator(container);
scene.addLighting().addControls();

// Create some 3D objects...
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
const cube = new THREE.Mesh(geometry, material);
cube.name = "MyBox";
scene.scene.add(cube);

// Enable picking with callbacks
scene.enablePicking(
  // Click callback
  (object: THREE.Object3D) => {
    console.log("Clicked:", object.name);
    // Change color on click
    if (object instanceof THREE.Mesh) {
      object.material.color.set(Math.random() * 0xffffff);
    }
  },
  // Hover callback
  (object: THREE.Object3D | null) => {
    if (object) {
      console.log("Hovering over:", object.name);
      // Highlight on hover
      if (object instanceof THREE.Mesh) {
        object.material.emissive.setHex(0xffffff);
      }
    } else {
      console.log("Left object");
    }
  }
);

// Get the currently selected object
const selected = scene.getSelectedObject();

// Programmatic picking at specific mouse coordinates
const result = scene.pickAt(-0.5, 0.2); // Normalized coordinates (-1 to 1)
if (result) {
  console.log("Picked object:", result.object.name);
  console.log("Distance:", result.distance);
  console.log("Hit point:", result.point);
}
```

Click and tap events are only fired when the pointer barely moves between
press and release, so orbiting or panning the camera never triggers a spurious
click. Tune the sensitivity (in pixels) via `clickDragThreshold` (default `6`):

```js
scene.clickDragThreshold = 10;
```

A third callback fires on right-click (context menu) of the hovered object;
the default browser menu is suppressed while picking is enabled:

```js
scene.enablePicking(
  (obj) => console.log("Clicked:", obj.name),
  (obj) => console.log("Hovering:", obj?.name ?? "none"),
  (obj) => console.log("Right-clicked:", obj.name) // context menu
);
```

### Physics

Opt into rigid-body physics with [cannon-es](https://github.com/pmndrs/cannon-es)
(MIT). Call `enablePhysics()` once, then link any mesh to a body with
`addBody()`. The world is stepped every frame and each body's position and
rotation are copied back onto its mesh automatically.

```js
scene.addLighting().addControls();

// Turn on physics and drop in a ground plane.
scene.enablePhysics({ gravity: [0, -12, 0], restitution: 0.4 });
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
add constraints, custom materials, or collision events. `cannon-es` (MIT) is a
dependency of the package and ships with it.

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
- `enablePicking(onClickCallback?: (obj: Object3D) => void, onHoverCallback?: (obj: Object3D | null) => void, onContextMenuCallback?: (obj: Object3D) => void): this` - Enable object picking with click/hover/right-click events
- `disablePicking(): this` - Disable picking
- `getSelectedObject(): Object3D | null` - Get currently selected/hovered object
- `pickAt(mouseX: number, mouseY: number): PickingResult | null` - Pick object at normalized mouse coordinates

**Physics**
- `enablePhysics(options?: PhysicsOptions): this` - Create the cannon-es world (gravity, default friction/restitution)
- `addBody(mesh: Object3D, options?: PhysicsBodyOptions): CANNON.Body` - Link a mesh to a rigid body, synced every frame
- `addGround(y?: number): CANNON.Body` - Add a static, infinite ground plane
- `removeBody(body: CANNON.Body): this` - Remove a body and stop syncing its mesh
- `physicsWorld?: CANNON.World` - The underlying world (for constraints, materials, events)

**Rendering**
- `startRenderLoop(): this` - Start rendering
- `stopRenderLoop(): this` - Stop rendering
- `setAdditionalRenderFn(fn: () => void): this` - Add custom render callback


