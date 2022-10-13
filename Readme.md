
## WORK IN PROGRESS
:construction: This package may change heavily in upcoming releases :construction:

## Features
The SceneCreator class, wraps Three.js and gsap to provide a simple API to load models, animate object, and setup the 3D scene.
_Optimized render function_: only calls the render function when something is moving.

## Usage

### Initialize & add to the page

```js
import { SceneCreator } from "3d-scene-creator";

const sceneCreator = new SceneCreator(document.getElementById("app"));
sceneCreator.startRenderLoop();
```

### Load 3D models

```js
await sceneCreator.loadModel("/examples/scene.json");
console.log("Scene loaded!");
```

### Add camera controls

```js
sceneCreator.addControls();
```

### Animate camera

```js
sceneCreator.moveCamera(new THREE.Vector3(10, 20, 20));
```

### Animate 3D object position, color and opacity

```js
const obj = await sceneCreator.loadModel("/examples/model.json");
obj.name = "Octa";
sceneCreator
  .animateModelColor("Octa", "red")
  .animateModelPosition("Octa", new THREE.Vector3(-1, 2, -2))
  .animateModelOpacity("Octa", 0.3, 10);

```

