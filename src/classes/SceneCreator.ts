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
  additionalRenderFn: (() => void) | undefined;
  stopLoop: boolean = false;
  scale: number = 1;
  animating: number = 0;

  // Picking/Raycasting properties
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  selectedObject: THREE.Object3D | null = null;
  pickingEnabled: boolean = false;
  onObjectClick: ((obj: THREE.Object3D) => void) | undefined;
  onObjectHover: ((obj: THREE.Object3D | null) => void) | undefined;
  onObjectContextMenu: ((obj: THREE.Object3D) => void) | undefined;

  /**
   * Initialize a 3D scene with Three.js and GSAP
   * @param container - Optional HTML element to attach the renderer to
   * @param scale - Scale factor for the scene (default: 1)
   * @param camPos - Initial camera position (default: 10, 10, 10)
   * @param targetPos - Initial camera target (default: 0, 0, 0)
   */
  constructor(container?: HTMLElement, scale?: number, camPos?: THREE.Vector3, targetPos?: THREE.Vector3) {
    if (container && !(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid HTMLElement');
    }

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    // Initialize picking/raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

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

  /**
   * Add orbit controls to the camera
   * @param overrides - Optional configuration overrides
   * @returns this for method chaining
   */
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
   * Set a callback function to be executed on each render frame
   * @param fn - Callback function to run each frame
   * @returns this for method chaining
   */
  setAdditionalRenderFn(fn: () => void) {
    this.additionalRenderFn = fn;
    return this;
  }

  resetSizes() {
    if (this.container) {
      this.cWidth = this.container.clientWidth;
      this.cHeight = this.container.clientHeight;
    }
  }

  /**
   * Animate the color of a 3D model
   * @param name - Name of the object in the scene
   * @param color - Target color (hex, rgb, or color name)
   * @param duration - Animation duration in seconds (default: 2)
   * @returns this for method chaining
   */
  animateModelColor(name: string, color: string | number, duration = 2) {
    const obj = this.scene.getObjectByName(name);
    if (!obj) {
      console.warn(`Object with name "${name}" not found in scene`);
      return this;
    }
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
    return this;
  }

  /**
   * Animate the opacity of a 3D model
   * @param name - Name of the object in the scene
   * @param value - Target opacity value (0-1)
   * @param duration - Animation duration in seconds (default: 2)
   * @returns this for method chaining
   */
  animateModelOpacity(name: string, value: number, duration = 2) {
    const obj = this.scene.getObjectByName(name)
    if (!obj) {
      console.warn(`Object with name "${name}" not found in scene`);
      return this;
    }
    obj.traverse((mesh) => {
      if (mesh instanceof THREE.Mesh) {
        mesh.material.transparent = true;
        mesh.material.needsUpdate = true;
        this.animating++;

        gsap.to(mesh.material, {
          duration,
          opacity: value,
          onComplete: () => {
            this.animating--;
            mesh.material.needsUpdate = true;
          }
        })
        mesh.material.needsUpdate = true;
      }
    });
    return this;
  }

  /**
   * Animate the position of a 3D model
   * @param name - Name of the object in the scene
   * @param newPosition - Target position vector
   * @param duration - Animation duration in seconds (default: 2)
   * @returns this for method chaining
   */
  animateModelPosition(name: string, newPosition: THREE.Vector3, duration = 2) {
    const obj = this.scene.getObjectByName(name)
    if (!obj) {
      console.warn(`Object with name "${name}" not found in scene`);
      return this;
    }
    gsap.to(obj.position, {
      duration,
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z
    });
    return this;
  }

  /**
   * Attach renderer to a DOM element and start rendering
   * @param container - HTML element to attach the canvas to
   * @returns this for method chaining
   */
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

  /**
   * Add default lighting to the scene (ambient + 2 directional lights)
   * @returns this for method chaining
   */
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

  /**
   * Add a skybox to the scene (360° background)
   * @param url - Optional URL to a 360° image texture
   * @param color - Fallback color if no texture URL provided
   * @param name - Optional name for the skybox object
   * @returns this for method chaining
   */
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
      this.animating ||
      this.additionalRenderFn) {
      renderer.render(scene, camera);
    }
    this.prevCamPos = this.camera.position.clone();
    if (this.additionalRenderFn) this.additionalRenderFn()
    if (this.controls) this.controls.update();
  }

  /**
   * Reset camera to initial position with animation
   * @returns this for method chaining
   */
  resetCameraPosition() {
    this.moveCamera(this.initialCamPos, this.initialTargetPos)
    return this;
  }

  /**
   * Animate camera to a new position
   * @param newPosCam - Target camera position
   * @param newPosTarget - Optional target position for orbit controls
   * @param callback - Optional callback on animation complete
   * @returns this for method chaining
   */
  moveCamera(newPosCam: THREE.Vector3, newPosTarget?: THREE.Vector3, callback?: () => void) {
    const camera = this.camera;

    let reEnable: boolean | undefined;
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
        if (this.controls && typeof reEnable === 'boolean') this.controls.enabled = reEnable;
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

  /**
   * Load a 3D model from a URL
   * @param url - URL to the model file
   * @param loader - Optional THREE.js loader (default: ObjectLoader)
   * @returns Promise that resolves with the loaded object
   */
  loadModel(url: string, loader?: THREE.Loader): Promise<THREE.Object3D> {
    if (!url) {
      return Promise.reject(new Error('URL is required'));
    }

    if (!loader) {
      loader = new THREE.ObjectLoader();
    }

    return loader.loadAsync(url).then((obj => {
      this.scene.add(obj);
      return obj;
    })).catch((error) => {
      console.error(`Failed to load model from "${url}":`, error);
      throw error;
    });
  }

  /**   * Enable interactive object picking with mouse events
   * @param onClickCallback - Callback when object is clicked
   * @param onContextMenuCallback - Callback when object is right-clicked
   * @returns this for method chaining
   */
  enablePicking(
    onClickCallback?: (object: THREE.Object3D) => void,
    onHoverCallback?: (object: THREE.Object3D | null) => void,
    onContextMenuCallback?: (object: THREE.Object3D) => void
  ) {
    this.pickingEnabled = true;
    this.onObjectClick = onClickCallback;
    this.onObjectHover = onHoverCallback;
    this.onObjectContextMenu = onContextMenuCallback;
    this.onObjectHover = onHoverCallback;

    if (!this.container) {
      console.warn('Container not set. Picking requires attachRenderer to be called first.');
      return this;
    }

    // Mouse move listener for hover detection
    this.container.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Perform raycasting
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const picked = intersects[0].object;
        if (picked !== this.selectedObject) {
          this.selectedObject = picked;
          if (this.onObjectHover) {
            this.onObjectHover(picked);
          }
        }
      } else {
        if (this.selectedObject !== null) {
          this.selectedObject = null;
          if (this.onObjectHover) {
            this.onObjectHover(null);
          }
        }
      }
    });

    // Mouse click listener
    this.container.addEventListener('click', () => {
      if (this.selectedObject && this.onObjectClick) {
        this.onObjectClick(this.selectedObject);
      }
    });
    
    // Touch support for mobile devices
    this.container.addEventListener('touchstart', (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        // Perform raycasting
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
          const picked = intersects[0].object;
          if (this.onObjectClick) {
            this.onObjectClick(picked);
          }
        }
      }
    }
    );

    // context menu 
    this.container.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
      if (this.selectedObject && this.onObjectContextMenu) {
        this.onObjectContextMenu(this.selectedObject);
      }
    }); 

    return this;
  }

  /**
   * Disable interactive object picking
   * @returns this for method chaining
   */
  disablePicking() {
    this.pickingEnabled = false;
    this.selectedObject = null;
    this.onObjectClick = undefined;
    this.onObjectHover = undefined;
    return this;
  }

  /**
   * Get currently hovered/selected object
   * @returns The selected object or null
   */
  getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  /**
   * Pick object at specific mouse position
   * @param mouseX - Normalized X coordinate (-1 to 1)
   * @param mouseY - Normalized Y coordinate (-1 to 1)
   * @returns PickingResult if object found, null otherwise
   */
  pickAt(mouseX: number, mouseY: number) {
    this.mouse.set(mouseX, mouseY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const intersection = intersects[0] as any;
      return {
        object: intersection.object,
        distance: intersection.distance,
        point: intersection.point,
        normal: intersection.normal || new THREE.Vector3(0, 1, 0),
        uv: intersection.uv || undefined
      };
    }
    return null;
  }

  /**   * Clean up scene resources and stop rendering
   * Call this when you're done with the scene to prevent memory leaks
   */
  dispose() {
    this.stopRenderLoop();
    this.renderer.dispose();
    this.scene.clear();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}


