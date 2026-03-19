## Features
- 🎬 The SceneCreator class wraps Three.js and GSAP to provide a simple API to load models, animate objects, and setup 3D scenes
- ⚡ **Optimized render function**: only renders when something is moving
- 🎯 **Type-safe API**: Full TypeScript support with JSDoc documentation
- 🔧 **Method chaining**: All methods return `this` for fluent API
- 🎨 **Easy animations**: Color, opacity, position, and camera animations
- 🎮 **Camera controls**: Built-in OrbitControls with customizable settings
- 🌅 **360° Skybox support**: Load panoramic images as backgrounds
- 💾 **Resource cleanup**: Automatic memory management with `dispose()` method
- 🎯 **Interactive mesh picking**: Click, hover, and right-click detection on 3D objects with custom callbacks


## Usage
### Install 

```bash
npm install 3d-scene-creator
```

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
// Load with default ObjectLoader
await scene.loadModel("/path/to/model.json");

// Load with custom loader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const gltfLoader = new GLTFLoader();
await scene.loadModel("/path/to/model.glb", gltfLoader);
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

### Lighting

```js
// Add default lighting setup (recommended)
scene.addLighting();
```

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
- `loadModel(url: string, loader?: THREE.Loader): Promise<Object3D>` - Load 3D model
- `dispose(): void` - Clean up resources

**Lighting & Scene Setup**
- `addLighting(): this` - Add default lighting
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
- `enablePicking(onClickCallback?: (obj: Object3D) => void, onHoverCallback?: (obj: Object3D | null) => void): this` - Enable object picking with click/hover events
- `disablePicking(): this` - Disable picking
- `getSelectedObject(): Object3D | null` - Get currently selected/hovered object
- `pickAt(mouseX: number, mouseY: number): PickingResult | null` - Pick object at normalized mouse coordinates

**Rendering**
- `startRenderLoop(): this` - Start rendering
- `stopRenderLoop(): this` - Stop rendering
- `setAdditionalRenderFn(fn: () => void): this` - Add custom render callback


