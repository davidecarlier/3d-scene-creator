import * as THREE from "three";

import { Tween, Group, Easing } from "@tweenjs/tween.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LightingOptions, AnimatedModel, AnimatedModelOptions, PlayAnimationOptions } from "../types";

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

  // Per-instance tween group (tween.js, MIT). Advanced once per frame in the
  // render loop and cleared on dispose, so tweens never leak across instances.
  private tweens: Group = new Group();

  // Animation mixers advanced once per frame in the render loop. While at least
  // one mixer is registered the loop keeps drawing, so animations play smoothly.
  private mixers: THREE.AnimationMixer[] = [];
  private lastFrameTime?: number;

  // Picking/Raycasting properties
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  selectedObject: THREE.Object3D | null = null;
  pickingEnabled: boolean = false;
  onObjectClick: ((obj: THREE.Object3D) => void) | undefined;
  onObjectHover: ((obj: THREE.Object3D | null) => void) | undefined;
  onObjectContextMenu: ((obj: THREE.Object3D) => void) | undefined;

  // Lazily-created GLTF loader + per-URL cache of loaded scenes.
  private gltfLoader?: GLTFLoader;
  private gltfCache: Map<string, Promise<THREE.Group>> = new Map();

  // Click-vs-drag discrimination: a pointer gesture only counts as a click if
  // it moves less than `clickDragThreshold` pixels between down and up.
  clickDragThreshold: number = 6;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private pointerDragging: boolean = false;

  /**
   * Initialize a 3D scene with Three.js and tween.js
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
   * Tween numeric properties of a target object. Durations are given in seconds; 
   * the render loop keeps drawing while at least one tween is active, then stops once they complete.
   * @param target - Object whose numeric props are animated
   * @param props - Destination values
   * @param duration - Duration in seconds
   * @param onComplete - Optional callback fired when the tween finishes
   * @returns the created Tween
   */
  private tween<T extends Record<string, any>>(
    target: T,
    props: Partial<Record<keyof T, number>>,
    duration: number,
    onComplete?: () => void
  ) {
    this.animating++;
    return new Tween(target, this.tweens)
      .to(props, duration * 1000)
      .easing(Easing.Quadratic.Out)
      .onComplete(() => {
        this.animating--;
        if (onComplete) onComplete();
      })
      .start();
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
        this.tween(mesh.material.color, { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b }, duration);
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

        this.tween(mesh.material, { opacity: value }, duration, () => {
          mesh.material.needsUpdate = true;
        });
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
    this.tween(obj.position, { x: newPosition.x, y: newPosition.y, z: newPosition.z }, duration);
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
   * Add a game-ready lighting rig: a hemisphere fill, a shadow-casting key
   * light, and an opposite fill light, with optional ACES tone mapping.
   * All parts are configurable; sensible defaults are used when omitted.
   * @param options - Lighting configuration overrides
   * @returns this for method chaining
   */
  addLighting(options: LightingOptions = {}) {
    const {
      hemisphere = { sky: 0xbcd4ff, ground: 0x3a2c16, intensity: 1.4 },
      key = {},
      fill = { color: 0x9ec3ff, intensity: 0.6, position: new THREE.Vector3(-10, 8, -8) },
      shadows = true,
      shadowArea = 16,
      shadowMapSize = 2048,
      toneMapping = true,
      exposure = 1.05,
    } = options;

    if (hemisphere) {
      const hemi = new THREE.HemisphereLight(
        hemisphere.sky ?? 0xbcd4ff,
        hemisphere.ground ?? 0x3a2c16,
        hemisphere.intensity ?? 1.4,
      );
      hemi.position.set(0, 20, 0);
      this.scene.add(hemi);
    }

    const keyLight = new THREE.DirectionalLight(key.color ?? 0xfff2dd, key.intensity ?? 2.6);
    keyLight.position.copy(key.position ?? new THREE.Vector3(8, 16, 10));
    this.scene.add(keyLight);

    if (fill) {
      const fillLight = new THREE.DirectionalLight(fill.color ?? 0x9ec3ff, fill.intensity ?? 0.6);
      fillLight.position.copy(fill.position ?? new THREE.Vector3(-10, 8, -8));
      this.scene.add(fillLight);
    }

    if (shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      const cam = keyLight.shadow.camera;
      cam.near = 1;
      cam.far = 60;
      cam.left = -shadowArea;
      cam.right = shadowArea;
      cam.top = shadowArea;
      cam.bottom = -shadowArea;
      cam.updateProjectionMatrix();
      keyLight.shadow.bias = -0.0004;
    }

    if (toneMapping) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = exposure;
    }

    return this;
  }

  /**
   * Enable shadow casting/receiving on every mesh currently in the scene.
   * Call after adding your meshes (and after {@link addLighting} with shadows on).
   * @param cast - Whether meshes cast shadows (default: true)
   * @param receive - Whether meshes receive shadows (default: true)
   * @returns this for method chaining
   */
  applyShadows(cast: boolean = true, receive: boolean = true) {
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = cast;
        obj.receiveShadow = receive;
      }
    });
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

    // Per-frame delta time (seconds), shared by tweens and animation mixers.
    const now = performance.now();
    const delta = this.lastFrameTime === undefined ? 0 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Advance any active tweens and animation mixers before deciding to draw.
    this.tweens.update();
    if (this.mixers.length) {
      for (const mixer of this.mixers) mixer.update(delta);
    }

    const scene = this.scene;
    const renderer = this.renderer;
    const camera = this.camera;

    if (
      camera.position.x !== this.prevCamPos.x ||
      camera.position.y !== this.prevCamPos.y ||
      camera.position.z !== this.prevCamPos.z ||
      this.animating ||
      this.mixers.length ||
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

    this.tween(camera.position, { x: newPosCam.x, y: newPosCam.y, z: newPosCam.z }, 3, () => {
      if (this.controls && typeof reEnable === 'boolean') this.controls.enabled = reEnable;
      if (typeof callback === 'function') callback();
    });
    if (newPosTarget && this.controls) {
      this.tween(this.controls.target, { x: newPosTarget.x, y: newPosTarget.y, z: newPosTarget.z }, 3);
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

    return loader.loadAsync(url).then(((obj: unknown) => {
      const object = obj as THREE.Object3D;
      this.scene.add(object);
      return object;
    })).catch((error) => {
      console.error(`Failed to load model from "${url}":`, error);
      throw error;
    });
  }

  /**
   * Load a glTF/glb model and return a fresh clone of its scene (not added to
   * the scene graph). Results are cached per URL, so loading the same model
   * many times only fetches/parses it once. Ideal for instancing buildings,
   * units, props, etc. in a game.
   * @param url - URL to the .glb/.gltf file
   * @returns Promise resolving to a cloneable Group ready to position/add
   */
  loadGLTF(url: string): Promise<THREE.Group> {
    if (!this.gltfLoader) {
      this.gltfLoader = new GLTFLoader();
    }
    let pending = this.gltfCache.get(url);
    if (!pending) {
      pending = this.gltfLoader.loadAsync(url).then((gltf) => gltf.scene);
      // Don't cache failures: drop the rejected promise so a later call can retry.
      pending.catch(() => this.gltfCache.delete(url));
      this.gltfCache.set(url, pending);
    }
    return pending.then((scene) => scene.clone(true));
  }

  /**
   * Register an AnimationMixer so it's advanced automatically every frame by
   * the render loop. The loop keeps drawing while any mixer is registered.
   * @param mixer - The mixer to drive
   * @returns this for method chaining
   */
  addMixer(mixer: THREE.AnimationMixer) {
    if (!this.mixers.includes(mixer)) this.mixers.push(mixer);
    return this;
  }

  /**
   * Stop driving a previously-registered AnimationMixer.
   * @param mixer - The mixer to remove
   * @returns this for method chaining
   */
  removeMixer(mixer: THREE.AnimationMixer) {
    const i = this.mixers.indexOf(mixer);
    if (i !== -1) this.mixers.splice(i, 1);
    return this;
  }

  /**
   * Load a rigged glTF/glb model, add it to the scene, and wire its animation
   * clips into the render loop. Unlike {@link loadGLTF} (which returns a clone
   * for static instancing), this keeps the original object so its skeleton
   * animates correctly, and returns a small handle to control playback.
   * @param url - URL to the .glb/.gltf file
   * @param options - Load options (add to scene, shadows, autoplay)
   * @returns Promise resolving to an {@link AnimatedModel} handle
   */
  async loadAnimatedModel(url: string, options: AnimatedModelOptions = {}): Promise<AnimatedModel> {
    const { add = true, shadows = true, autoplay } = options;
    if (!this.gltfLoader) {
      this.gltfLoader = new GLTFLoader();
    }

    const gltf = await this.gltfLoader.loadAsync(url);
    const model = gltf.scene;

    if (shadows) {
      model.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    }
    if (add) this.scene.add(model);

    const mixer = new THREE.AnimationMixer(model);
    this.addMixer(mixer);

    const actions: Record<string, THREE.AnimationAction> = {};
    for (const clip of gltf.animations) {
      actions[clip.name] = mixer.clipAction(clip);
    }

    let activeAction: THREE.AnimationAction | null = null;

    const play = (name: string, opts: PlayAnimationOptions = {}): THREE.AnimationAction | null => {
      const { fade = 0.3, loop = true, clampWhenFinished = true } = opts;
      const next = actions[name];
      if (!next) {
        console.warn(`Animation clip "${name}" not found on model "${url}"`);
        return null;
      }
      if (next === activeAction) return next;

      next.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
      next.clampWhenFinished = clampWhenFinished;
      if (activeAction) activeAction.fadeOut(fade);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
      activeAction = next;
      return next;
    };

    const stop = (fade = 0.3) => {
      if (activeAction) {
        activeAction.fadeOut(fade);
        activeAction = null;
      }
    };

    const names = gltf.animations.map((c) => c.name);
    if (autoplay !== false && names.length) {
      play(typeof autoplay === "string" ? autoplay : names[0], { fade: 0 });
    }

    return { model, animations: gltf.animations, names, mixer, actions, play, stop };
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

    // Track pointer gesture distance so an orbit/pan drag never fires a click.
    this.container.addEventListener('pointerdown', (event: PointerEvent) => {
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
      this.pointerDragging = false;
    });
    this.container.addEventListener('pointermove', (event: PointerEvent) => {
      if (this.pointerDragging) return;
      const dx = event.clientX - this.pointerDownX;
      const dy = event.clientY - this.pointerDownY;
      if (Math.hypot(dx, dy) > this.clickDragThreshold) {
        this.pointerDragging = true;
      }
    });

    // Mouse click listener (suppressed when the gesture was a drag)
    this.container.addEventListener('click', () => {
      if (this.pointerDragging) return;
      if (this.selectedObject && this.onObjectClick) {
        this.onObjectClick(this.selectedObject);
      }
    });

    // Touch support for mobile devices: pick on touchend only if it was a tap.
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    this.container.addEventListener('touchstart', (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchMoved = false;
      } else {
        touchMoved = true; // multi-touch = gesture, never a tap
      }
    });
    this.container.addEventListener('touchmove', (event: TouchEvent) => {
      if (touchMoved || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;
      if (Math.hypot(dx, dy) > this.clickDragThreshold) touchMoved = true;
    });
    this.container.addEventListener('touchend', (event: TouchEvent) => {
      if (touchMoved) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0 && this.onObjectClick) {
        this.onObjectClick(intersects[0].object);
      }
    });

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
    this.tweens.removeAll();
    this.mixers.forEach((m) => m.stopAllAction());
    this.mixers = [];
    this.animating = 0;
    this.renderer.dispose();
    this.scene.clear();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}


