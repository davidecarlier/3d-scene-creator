import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type * as CANNON from "cannon-es";

import { SceneContext } from "../core/SceneContext";
import { RenderLoop } from "../core/RenderLoop";
import { RendererManager } from "../core/RendererManager";
import { AssetLoader } from "../managers/AssetLoader";
import { AnimationManager } from "../managers/AnimationManager";
import { CameraManager } from "../managers/CameraManager";
import { ControlsManager } from "../managers/ControlsManager";
import { LightingManager } from "../managers/LightingManager";
import { EnvironmentManager } from "../managers/EnvironmentManager";
import { PickingManager } from "../managers/PickingManager";
import { PhysicsManager } from "../managers/PhysicsManager";

import type {
  LightingOptions,
  AnimatedModel,
  AnimatedModelOptions,
  PhysicsOptions,
  PhysicsBodyOptions,
  PickingOptions,
  LegacyClickCallback,
  LegacyHoverCallback,
} from "../types";

/**
 * A fluent facade over Three.js + tween.js for building interactive 3D scenes.
 *
 * SceneCreator itself owns no rendering logic: it wires together a set of small,
 * single-responsibility managers (renderer/canvas, camera, controls, lighting,
 * asset loading, animation, picking, physics, environment) and delegates to
 * them. This keeps each concern isolated and testable while preserving the
 * simple, chainable API — `new SceneCreator(container).addLighting().addControls()`
 * works exactly as before.
 *
 * Need lower-level access? The underlying Three.js objects are exposed through
 * {@link scene}, {@link renderer}, {@link camera}, {@link controls} and
 * {@link physicsWorld}.
 */
export class SceneCreator {
  private ctx: SceneContext;
  private loop: RenderLoop;
  private rendererManager: RendererManager;
  private assets: AssetLoader;
  private animation: AnimationManager;
  private cameraManager: CameraManager;
  private controlsManager: ControlsManager;
  private lighting: LightingManager;
  private environment: EnvironmentManager;
  private picking: PickingManager;
  private physics: PhysicsManager;

  /**
   * Initialize a 3D scene with Three.js and tween.js.
   * @param container - Optional HTML element to attach the renderer to
   * @param scale - Scale factor for the scene (default: 1)
   * @param camPos - Initial camera position (default: 10, 10, 10)
   * @param targetPos - Initial camera target (default: 0, 0, 0)
   */
  constructor(container?: HTMLElement, scale?: number, camPos?: THREE.Vector3, targetPos?: THREE.Vector3) {
    if (container && !(container instanceof HTMLElement)) {
      throw new Error("Container must be a valid HTMLElement");
    }

    this.ctx = new SceneContext(scale ?? 1);
    this.loop = new RenderLoop(this.ctx);

    this.assets = new AssetLoader(this.ctx);
    this.animation = new AnimationManager(this.ctx, this.loop, this.assets);
    this.cameraManager = new CameraManager(
      this.ctx,
      this.animation,
      () => this.controlsManager.controls,
      camPos,
      targetPos,
    );
    this.controlsManager = new ControlsManager(
      this.ctx,
      this.loop,
      () => this.cameraManager.initialTargetPos,
    );
    this.lighting = new LightingManager(this.ctx);
    this.environment = new EnvironmentManager(this.ctx);
    this.picking = new PickingManager(this.ctx);
    this.physics = new PhysicsManager(this.loop);

    // Created last: installs the resize listener and (if a container is given)
    // attaches the canvas and starts the render loop.
    this.rendererManager = new RendererManager(this.ctx, this.loop);

    if (container) {
      this.rendererManager.attachRenderer(container);
    }
  }

  // ---------------------------------------------------------------------------
  // Exposed Three.js objects (read-only access to the underlying primitives)
  // ---------------------------------------------------------------------------

  /** The underlying THREE.Scene. Add your own meshes here. */
  get scene(): THREE.Scene {
    return this.ctx.scene;
  }

  /** The underlying THREE.WebGLRenderer. */
  get renderer(): THREE.WebGLRenderer {
    return this.ctx.renderer;
  }

  /** The perspective camera. */
  get camera(): THREE.PerspectiveCamera {
    return this.ctx.camera;
  }

  /** The OrbitControls instance, once {@link addControls} has been called. */
  get controls(): OrbitControls | undefined {
    return this.controlsManager.controls;
  }

  /** The cannon-es world, once {@link enablePhysics} has been called. */
  get physicsWorld(): CANNON.World | undefined {
    return this.physics.world;
  }

  /** Scene scale factor. */
  get scale(): number {
    return this.ctx.scale;
  }

  /** Pixels of pointer travel still treated as a click (default: 6). */
  get clickDragThreshold(): number {
    return this.picking.clickDragThreshold;
  }
  set clickDragThreshold(value: number) {
    this.picking.clickDragThreshold = value;
  }

  // ---------------------------------------------------------------------------
  // Renderer / canvas lifecycle
  // ---------------------------------------------------------------------------

  /** Attach the renderer to a DOM element and start rendering. */
  attachRenderer(container: HTMLElement) {
    this.rendererManager.attachRenderer(container);
    return this;
  }

  /** Re-read the container's pixel dimensions. */
  resetSizes() {
    this.rendererManager.resetSizes();
    return this;
  }

  /** Start the render loop. */
  startRenderLoop() {
    this.loop.start();
    return this;
  }

  /** Stop the render loop. */
  stopRenderLoop() {
    this.loop.stop();
    return this;
  }

  /** Set a callback executed on each render frame. */
  setAdditionalRenderFn(fn: () => void) {
    this.loop.additionalRenderFn = fn;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  /** Animate the camera to a new position (and optionally the controls target). */
  moveCamera(newPosCam: THREE.Vector3, newPosTarget?: THREE.Vector3, callback?: () => void) {
    this.cameraManager.moveCamera(newPosCam, newPosTarget, callback);
    return this;
  }

  /** Reset the camera to its initial position with animation. */
  resetCameraPosition() {
    this.cameraManager.resetCameraPosition();
    return this;
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  /** Add orbit controls to the camera. */
  addControls(overrides: Record<string, any> = {}) {
    this.controlsManager.addControls(overrides);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Lighting & environment
  // ---------------------------------------------------------------------------

  /** Add a configurable lighting rig (hemisphere + key/fill lights, shadows, tone mapping). */
  addLighting(options: LightingOptions = {}) {
    this.lighting.addLighting(options);
    return this;
  }

  /** Toggle shadow casting/receiving on every mesh currently in the scene. */
  applyShadows(cast: boolean = true, receive: boolean = true) {
    this.lighting.applyShadows(cast, receive);
    return this;
  }

  /** Add a 360° skybox (image texture or solid color). */
  addSkybox(url?: string, color: THREE.ColorRepresentation = "#B2FFFF", name?: string) {
    this.environment.addSkybox(url, color, name);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Asset loading
  // ---------------------------------------------------------------------------

  /** Load a 3D model from a URL and add it to the scene. */
  loadModel(url: string, loader?: THREE.Loader): Promise<THREE.Object3D> {
    return this.assets.loadModel(url, loader);
  }

  /** Load a glTF/GLB model and return a cached, cloneable Group (not added to the scene). */
  loadGLTF(url: string): Promise<THREE.Group> {
    return this.assets.loadGLTF(url);
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  /** Animate the color of a named model in the scene. */
  animateModelColor(name: string, color: string | number, duration = 2) {
    this.animation.animateModelColor(name, color, duration);
    return this;
  }

  /** Animate the opacity of a named model in the scene. */
  animateModelOpacity(name: string, value: number, duration = 2) {
    this.animation.animateModelOpacity(name, value, duration);
    return this;
  }

  /** Animate the position of a named model in the scene. */
  animateModelPosition(name: string, newPosition: THREE.Vector3, duration = 2) {
    this.animation.animateModelPosition(name, newPosition, duration);
    return this;
  }

  /** Register an AnimationMixer driven automatically each frame. */
  addMixer(mixer: THREE.AnimationMixer) {
    this.animation.addMixer(mixer);
    return this;
  }

  /** Stop driving a previously-registered AnimationMixer. */
  removeMixer(mixer: THREE.AnimationMixer) {
    this.animation.removeMixer(mixer);
    return this;
  }

  /** Load a rigged glTF, wire its clips into the render loop, and return a playback handle. */
  loadAnimatedModel(url: string, options: AnimatedModelOptions = {}): Promise<AnimatedModel> {
    return this.animation.loadAnimatedModel(url, options);
  }

  // ---------------------------------------------------------------------------
  // Physics
  // ---------------------------------------------------------------------------

  /** Load cannon-es on demand and create the physics world. `await` before adding bodies. */
  async enablePhysics(options: PhysicsOptions = {}) {
    await this.physics.enablePhysics(options);
    return this;
  }

  /** Link a mesh to a rigid body, kept in sync every frame. */
  addBody(mesh: THREE.Object3D, options: PhysicsBodyOptions = {}) {
    return this.physics.addBody(mesh, options);
  }

  /** Add a static, infinite ground plane. */
  addGround(y: number = 0) {
    return this.physics.addGround(y);
  }

  /** Remove a body and stop syncing its mesh. */
  removeBody(body: CANNON.Body) {
    this.physics.removeBody(body);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Picking / interactions
  // ---------------------------------------------------------------------------

  /**
   * Enable interactive object picking. Pass a typed {@link PickingOptions}
   * object (recommended) to get `onClick` / `onHover` / `onEnter` / `onLeave` /
   * `onContextMenu` callbacks with `{ object, intersection, originalEvent }`,
   * plus `recursive` and `filter` tuning. The legacy positional form
   * `(onClick, onHover, onContextMenu)` is still supported.
   */
  enablePicking(options?: PickingOptions): this;
  enablePicking(
    onClick?: LegacyClickCallback,
    onHover?: LegacyHoverCallback,
    onContextMenu?: LegacyClickCallback,
  ): this;
  enablePicking(
    a?: PickingOptions | LegacyClickCallback,
    b?: LegacyHoverCallback,
    c?: LegacyClickCallback,
  ) {
    // Forward whichever form was used; PickingManager handles both.
    (this.picking.enablePicking as (...args: unknown[]) => void)(a, b, c);
    return this;
  }

  /** Disable interactive object picking. */
  disablePicking() {
    this.picking.disablePicking();
    return this;
  }

  /** Get the currently hovered/selected object. */
  getSelectedObject(): THREE.Object3D | null {
    return this.picking.getSelectedObject();
  }

  /** Pick the object at a specific normalized mouse position (-1..1). */
  pickAt(mouseX: number, mouseY: number) {
    return this.picking.pickAt(mouseX, mouseY);
  }

  // ---------------------------------------------------------------------------
  // Disposal / cleanup
  // ---------------------------------------------------------------------------

  /**
   * Clean up scene resources and stop rendering. Call this when you're done
   * with the scene to prevent memory leaks. Each manager tears down what it
   * owns (tweens, mixers, physics bodies, DOM listeners, lights, the canvas).
   */
  dispose() {
    this.loop.stop();
    this.animation.dispose();
    this.physics.dispose();
    this.picking.dispose();
    this.controlsManager.dispose();
    this.environment.dispose();
    this.lighting.dispose();
    this.rendererManager.dispose();
    this.ctx.scene.clear();
  }
}
