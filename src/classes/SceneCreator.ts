import * as THREE from "three";

import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class SceneCreator {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement | undefined;
  cWidth: number;
  cHeight: number;
  camera: THREE.PerspectiveCamera;
  initialCamPos: THREE.Vector3;
  initialTargetPos: THREE.Vector3;
  prevCamPos: THREE.Vector3;
  controls: OrbitControls | undefined;
  additionalRenderFn: Function | undefined;
  stopLoop: boolean = false;
  scale: number = 1;
  animating: number = 0;

  constructor(container?: HTMLElement, scale?: number, camPos?: THREE.Vector3, targetPos?: THREE.Vector3) {

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    if (scale) {
      this.scale = scale;
    }

    this.cWidth = 0
    this.cHeight = 0
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.cWidth / this.cHeight,
      0.1 * this.scale,
      2000 * this.scale
    );
    if (camPos) {
      this.initialCamPos = camPos
    } else {
      this.initialCamPos = new THREE.Vector3(10 * this.scale, 10 * this.scale, 10 * this.scale)
    }

    // to render at least first frame
    this.prevCamPos = new THREE.Vector3(this.initialCamPos.x + 1, 1, 1)

    if (targetPos) {
      this.initialTargetPos = targetPos
    } else {
      this.initialTargetPos = new THREE.Vector3(0, 0, 0);
    }


    this.camera.position.set(this.initialCamPos.x, this.initialCamPos.y, this.initialCamPos.z);
    var cameraTarget = this.initialTargetPos;
    this.camera.lookAt(cameraTarget);


    this.resizeListener();
    if (container) {
      this.attachRenderer(container);
    }

  }
  addControls(overrides = {}) {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const defaults = {
      enabled: true,
      enableDamping: true,
      dampingFactor: 0.25,
      maxPolarAngle: Math.PI / 2,
      maxDistance: 500 * this.scale,
      minDistance: 0,
      rotateSpeed: 1,
      enableZoom: true,
      enablePan: true
    }

    const values = Object.assign(defaults, overrides);
    Object.assign(this.controls, values);
    this.controls.target.set(
      this.initialTargetPos.x,
      this.initialTargetPos.y,
      this.initialTargetPos.z
    );

    return this;
  }

  /**
   * Set a callback function 
   * for the renderer
   */
  setAdditionalRenderFn(fn: Function) {
    this.additionalRenderFn = fn;
  }

  resetSizes() {
    if (this.container) {
      this.cWidth = this.container.clientWidth;
      this.cHeight = this.container.clientHeight;
    }
  }

  animateModelColor(name: string, color: string | number, duration = 2) {
    const obj = this.scene.getObjectByName(name);
    if (obj) {
      let rgbColor = new THREE.Color(color);
      obj.traverse((mesh) => {
        if (mesh instanceof THREE.Mesh) {
          this.animating++;
          gsap.to(mesh.material.color, {
            duration, r: rgbColor.r, b: rgbColor.b, g: rgbColor.g, onComplete: () => {
              this.animating--;
            }
          })
        }
      });
    }
    return this;
  }

  animateModelOpacity(name: string, value: number, duration = 2) {
    const obj = this.scene.getObjectByName(name)
    if (obj) {
      obj.traverse((mesh) => {
        if (mesh instanceof THREE.Mesh) {
          mesh.material.transparent = true;
          mesh.material.needsUpdate = true;
          this.animating++;

          gsap.to(mesh.material, {
            duration,
            opacity: value,
            onComplete: () => {
              this.animating++;
              mesh.material.needsUpdate = true;
            }
          })
          mesh.material.needsUpdate = true;
        }
      });
    }
    return this;
  }

  animateModelPosition(name: string, newPosition: THREE.Vector3, duration = 2) {
    const obj = this.scene.getObjectByName(name)
    if (obj) {
      gsap.to(obj.position, {
        duration,
        x: newPosition.x,
        y: newPosition.y,
        z: newPosition.z
      });
    }
    return this;
  }

  attachRenderer(container: HTMLElement) {
    this.container = container;
    this.resetSizes();
    this.camera.aspect = this.cWidth / this.cHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.cWidth, this.cHeight);
    this.container.appendChild(this.renderer.domElement);
    this.scene.updateMatrixWorld(true);
    this.startRenderLoop();
    return this;
  }

  addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(1, 1, 0)
    this.scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight2.position.set(-1, 1, -1);
    this.scene.add(directionalLight2);
    return this;
  }

  addSkybox(url?: string, color: THREE.ColorRepresentation = "#B2FFFF", name?: string) {
    const sphereGeom = new THREE.SphereGeometry(1000 * this.scale, 60, 60);
    sphereGeom.scale(-1, 1, 1)
    let sphereMaterial;
    if (url) {
      THREE.TextureLoader.prototype.crossOrigin = 'anonymous';
      sphereMaterial = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(url)
      });
    } else {
      sphereMaterial = new THREE.MeshStandardMaterial({ color });
    }
    const skybox = new THREE.Mesh(sphereGeom, sphereMaterial);
    skybox.name = name ? name : 'skybox';
    this.scene.add(skybox);
    return this;
  }

  resizeListener() {
    this.resetSizes();

    window.addEventListener(
      "resize",
      () => {
        this.resetSizes();
        const camera = this.camera;
        const renderer = this.renderer;

        camera.aspect = this.cWidth / this.cHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(this.cWidth * 1, this.cHeight * 1);
        camera.position.x = camera.position.x + 0.001
      },
      false
    );
  }

  stopRenderLoop() {
    this.stopLoop = true;

    return this
  }

  startRenderLoop() {
    this.stopLoop = false;
    this.renderLoop();

    return this
  }

  renderLoop() {
    if (this.stopLoop) return

    requestAnimationFrame(this.renderLoop.bind(this));

    const scene = this.scene;
    const renderer = this.renderer;
    const camera = this.camera;

    if (
      camera.position.x !== this.prevCamPos.x ||
      camera.position.y !== this.prevCamPos.y ||
      camera.position.z !== this.prevCamPos.z ||
      this.animating) {
      renderer.render(scene, camera);
    }
    this.prevCamPos = this.camera.position.clone();
    if (this.additionalRenderFn) this.additionalRenderFn()
    if (this.controls) this.controls.update();
  }

  resetCameraPosition() {
    this.moveCamera(this.initialCamPos, this.initialTargetPos)
  }

  moveCamera(newPosCam: THREE.Vector3, newPosTarget?: THREE.Vector3, callback?: Function) {
    const camera = this.camera;

    let reEnable: boolean;
    if (this.controls) {
      reEnable = this.controls.enabled;
      this.controls.enabled = false;
    }

    gsap.to(camera.position, {
      duration: 3,
      x: newPosCam.x,
      y: newPosCam.y,
      z: newPosCam.z,
      onComplete: () => {
        if (this.controls) this.controls.enabled = reEnable;
        if (typeof callback === 'function') callback();
      }
    });
    if (newPosTarget && this.controls) {
      gsap.to(this.controls.target, {
        duration: 3,
        x: newPosTarget.x,
        y: newPosTarget.y,
        z: newPosTarget.z
      });
    }
    return this
  }

  loadModel(url: string, loader?: THREE.Loader): Promise<THREE.Object3D> {

    if (!loader) {
      loader = new THREE.ObjectLoader();
    }

    return loader.loadAsync(url).then((obj => {
      this.scene.add(obj);
      return obj;
    }));
  }

}


