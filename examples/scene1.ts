import SceneCreator from '../src/main'
import "./style.css";
let sceneCreator = new SceneCreator(document.getElementById('app'),0.1);
sceneCreator.loadScene("/examples/scene.json",()=>{
	console.log('scene loaded')
	sceneCreator.startRenderLoop()
	.addSkybox()
	.addLighting()
	.addControls()
	.changeModelColor("Cube", "#00ff00",2)
});
