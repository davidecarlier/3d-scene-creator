# 3D Scene Creator

Easily add 3D interactive scenes to your website.

## Usage

### Initialize & add to the page
```js
import { SceneCreator } from '3d-scene-creator';

const sceneCreator = new SceneCreator(document.getElementById('app'));
sceneCreator.startRenderLoop()

```

- Load 3D scenes or models exported via [three.js editor](https://threejs.org/editor/)
```js
await sceneCreator.loadScene("/examples/scene.json");
console.log("Scene loaded!")
```

- Add camera controls
```js
sceneCreator.addControls();
```
- Animate camera
```js
sceneCreator.addControls();
```

- Animate 3D object position
- Animate 3D object color and opacity
