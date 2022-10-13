# 3D Scene Creator

Easily add 3D interactive scenes to your website.

## Usage

### Initialize & add to the page
```js
let sceneCreator = new SceneCreator(document.getElementById('app'));
sceneCreator.startRenderLoop()

```

- Load 3D scenes or models exported via [three.js editor](https://threejs.org/editor/)
```js
sceneCreator.loadScene("/examples/scene.json");
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
