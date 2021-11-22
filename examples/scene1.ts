import SceneCreator from '../src/main'
import "./style.css";

let sceneCreator = new SceneCreator(document.getElementById('app'),0.5);

sceneCreator.loadScene("/examples/scene.json",()=>{
	console.log('scene loaded')
	sceneCreator.startRenderLoop()
	.addSkybox()
	.addLighting()
	.addControls()
	.changeModelColor("Cube", "#00ff00",2)
	.loadModel("/examples/model.json", undefined, function(obj: THREE.Object3D){
		obj.name = 'Octa';
		sceneCreator.changeModelColor('Octa', "red")
	})
});
