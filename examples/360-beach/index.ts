import * as THREE from 'three';
import { SceneCreator } from '../../src/main';

const container = document.createElement('div');
container.style.height = '100vh';
container.style.width = '100%';
document.body.append(container)

const sceneCreator = new SceneCreator(container);
sceneCreator.startRenderLoop()
	.addSkybox("kris-guico-rsB-he-ye7w-unsplash.jpg")
	.addLighting()
	.addControls()

sceneCreator.moveCamera(new THREE.Vector3(10, 20, 20));
