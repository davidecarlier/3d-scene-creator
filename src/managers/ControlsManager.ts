import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SceneContext } from "../core/SceneContext";
import type { RenderLoop } from "../core/RenderLoop";

/**
 * Owns the OrbitControls instance. Controls are created on demand by
 * {@link addControls}; a single after-render hook (registered up front) calls
 * `update()` each frame once they exist.
 */
export class ControlsManager {
  controls?: OrbitControls;

  constructor(
    private ctx: SceneContext,
    private loop: RenderLoop,
    private getInitialTarget: () => THREE.Vector3,
  ) {
    this.loop.onAfterRender(() => this.controls?.update());
  }

  /** Add orbit controls to the camera with optional config overrides. */
  addControls(overrides: Record<string, any> = {}) {
    const controls = new OrbitControls(this.ctx.camera, this.ctx.renderer.domElement);

    const defaults = {
      enabled: true,
      enableDamping: true,
      dampingFactor: 0.25,
      maxPolarAngle: Math.PI / 2,
      maxDistance: 500 * this.ctx.scale,
      minDistance: 0,
      rotateSpeed: 1,
      enableZoom: true,
      enablePan: true,
    };

    const values = Object.assign(defaults, overrides);
    Object.assign(controls, values);

    const target = this.getInitialTarget();
    controls.target.set(target.x, target.y, target.z);

    this.controls = controls;
  }

  dispose() {
    this.controls?.dispose();
    this.controls = undefined;
  }
}
