import * as THREE from 'three';
import { SceneCreator } from '../src/main';

async function initExample() {

	const container = document.createElement('div');
	container.style.height = '100vh';
	container.style.width = '100%';
	document.body.append(container)
	
	const sceneCreator = new SceneCreator(container);
	await sceneCreator.loadModel("/examples/scene.json")
	console.log('scene loaded')
	sceneCreator.startRenderLoop()
		.addSkybox()
		.addLighting()
		.addControls()
		.animateModelColor("Cube", "#00ff00", 2);

	const obj = await sceneCreator.loadModel("/examples/model.json");
	obj.name = 'Octa';
	sceneCreator.animateModelColor('Octa', "red")
		.animateModelPosition('Octa', new THREE.Vector3(-1, 2, -2))
		.animateModelOpacity('Octa', 0.3, 10)

	sceneCreator.animateModelColor('skybox', "purple");
	sceneCreator.moveCamera(new THREE.Vector3(10, 20, 20));

}

initExample();