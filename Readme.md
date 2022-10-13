# 3D Scene Creator

A simple utility to create and manage a 3D scene.

 :construction: Work in progress. This package might heavily change in next releases. :construction:

## Usage

### Initialize & add to the page

```js
import { SceneCreator } from "3d-scene-creator";

const sceneCreator = new SceneCreator(document.getElementById("app"));
sceneCreator.startRenderLoop();
```

- Load 3D models

```js
await sceneCreator.loadModel("/examples/scene.json");
console.log("Scene loaded!");
```

- Add camera controls

```js
sceneCreator.addControls();
```

- Animate camera

```js
sceneCreator.addControls();
```

- Animate 3D object position, color and opacity

```js
const obj = await sceneCreator.loadModel("/examples/model.json");
obj.name = "Octa";
sceneCreator
  .animateModelColor("Octa", "red")
  .animateModelPosition("Octa", new THREE.Vector3(-1, 2, -2))
  .animateModelOpacity("Octa", 0.3, 10);

sceneCreator.animateModelColor("skybox", "purple");
sceneCreator.moveCamera(new THREE.Vector3(10, 20, 20));
```

