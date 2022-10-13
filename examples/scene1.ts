import * as THREE from 'three';
import SceneCreator from '../dist/3d-scene-creator.es.js';
import "./style.css";

const sceneCreator = new SceneCreator(document.getElementById('app'));

sceneCreator.loadScene("/examples/scene.json", () => {
	console.log('scene loaded')
	sceneCreator.startRenderLoop()
		.addSkybox()
		.addLighting()
		.addControls()
		.animateModelColor("Cube", "#00ff00", 2)
		.loadModel("/examples/model.json", undefined, function (obj: THREE.Object3D) {
			obj.name = 'Octa';
			this.animateModelColor('Octa', "red")
				.animateModelPosition('Octa', new THREE.Vector3(-1, 2, -2))
				.animateModelOpacity('Octa', 0, 10)
		});
	sceneCreator.animateModelColor('skybox', "purple")

});
