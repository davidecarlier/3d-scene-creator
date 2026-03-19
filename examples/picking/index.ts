import { SceneCreator } from "../../src/main";
import * as THREE from "three";

// Setup
const container = document.getElementById('canvas-container') as HTMLElement;
const scene = new SceneCreator(container, 1, new THREE.Vector3(12, 8, 12));

// Add lighting and controls
scene
    .addLighting()
    .addControls({
        enableDamping: true,
        dampingFactor: 0.05,
    })
    .addSkybox(undefined, "#1a1a2e");

// Create interactive cube objects
const cubes: { mesh: THREE.Mesh; name: string; originalColor: THREE.Color }[] = [];
const colors = [0xff6b6b, 0x4ecdc4, 0xffd93d, 0xa8e6cf];
const positions = [
    { x: -4, y: 2, z: 0 },
    { x: 0, y: 2, z: 0 },
    { x: 4, y: 2, z: 0 },
    { x: 2, y: 2, z: -4 }
];

positions.forEach((pos, i) => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: colors[i] });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.name = `Cube_${i + 1}`;

    scene.scene.add(mesh);

    cubes.push({
        mesh,
        name: `Cube ${i + 1}`,
        originalColor: new THREE.Color(colors[i])
    });
});

// State
let clickCount = 0;
let rightClickCount = 0;
let hoveredObject: THREE.Object3D | null = null;

// Enable picking with callbacks
scene.enablePicking(
    // Click callback
    (object: THREE.Object3D) => {
        clickCount++;
        showClickFeedback(object);
        console.log(`Clicked: ${object.name}`);
    },
    // Hover callback
    (object: THREE.Object3D | null) => {
        handleHover(object);
    },
    // context menu callback (right-click)
    (object: THREE.Object3D | null) => {
        if (object) {
            rightClickCount++;
            showRightClickFeedback(object);
            console.log(`Right-clicked on: ${object.name}`);
        }
    }
);

function handleHover(object: THREE.Object3D | null) {
    // Reset previous hover
    if (hoveredObject && hoveredObject instanceof THREE.Mesh) {
        const cube = cubes.find(c => c.mesh === hoveredObject);
        if (cube) {
            cube.mesh.material.emissive.setHex(0x000000);
            cube.mesh.scale.set(1, 1, 1);
        }
    }

    hoveredObject = object;

    if (object && object instanceof THREE.Mesh) {
        const cube = cubes.find(c => c.mesh === object);
        if (cube) {
            // Highlight on hover
            object.material.emissive.setHex(0xffffff);
            object.scale.set(1.1, 1.1, 1.1);

            // Update info display
            updateInfoDisplay(cube);
            document.getElementById('selected-info')!.style.display = 'block';
        }
    } else {
        document.getElementById('selected-info')!.style.display = 'none';
    }
}

function showClickFeedback(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) {
        const cube = cubes.find(c => c.mesh === object);
        if (cube) {
            // Flash animation on click
            const originalEmissive = object.material.emissive.getHex();
            object.material.emissive.setHex(0xffff00);

            setTimeout(() => {
                object.material.emissive.setHex(originalEmissive);
            }, 150);

            // Update click count
            document.getElementById('click-count')!.textContent = clickCount.toString();
        }
    }
}
function showRightClickFeedback(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) {
        const cube = cubes.find(c => c.mesh === object);
        if (cube) {
            // Flash animation on click
            const originalEmissive = object.material.emissive.getHex();
            object.material.emissive.setHex(0xff00ff);

            setTimeout(() => {
                object.material.emissive.setHex(originalEmissive);
            }, 150);

            document.getElementById('right-click-count')!.textContent = rightClickCount.toString();
        }
    }
}
function updateInfoDisplay(cube: any) {
    const selectedObject = scene.getSelectedObject();
    if (selectedObject) {
        const distance = scene.camera.position.distanceTo(selectedObject.position);

        document.getElementById('selected-name')!.textContent = cube.name;
        document.getElementById('selected-distance')!.textContent = distance.toFixed(2);
    }
}

// Add mouse move feedback in render loop
scene.setAdditionalRenderFn(() => {
    // You can add additional per-frame logic here
    // For example: animate all cubes
    cubes.forEach((cube, index) => {
        cube.mesh.rotation.x += 0.001;
        cube.mesh.rotation.y += 0.002;
    });
});

console.log("🎯 Scene ready! Hover and click on the cubes to test picking.");
console.log("Tip: Use mouse to rotate, scroll to zoom. Click cubes to see interaction.");
