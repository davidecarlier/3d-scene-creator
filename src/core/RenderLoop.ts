import * as THREE from "three";
import type { SceneContext } from "./SceneContext";

/**
 * Owns the requestAnimationFrame loop and the "only draw when something
 * changed" optimization. Subsystems plug into it instead of each running their
 * own loop:
 *
 *  - `onBeforeRender(fn)` — advance state each frame (tweens, mixers, physics).
 *  - `onAfterRender(fn)`  — run after the draw decision (e.g. controls.update).
 *  - `addActivitySource(fn)` — report "something is still moving", which forces
 *    a draw even when the camera is stationary.
 *
 * The loop renders when the camera moved, any activity source is truthy, or a
 * custom per-frame callback is set — matching the original behavior exactly.
 */
export class RenderLoop {
  private stopLoop: boolean = true;
  private lastFrameTime?: number;
  private prevCamPos: THREE.Vector3;

  private beforeRender: ((delta: number) => void)[] = [];
  private afterRender: (() => void)[] = [];
  private activitySources: (() => boolean)[] = [];

  /** Optional per-frame callback. Its mere presence forces continuous drawing. */
  additionalRenderFn?: () => void;

  constructor(private ctx: SceneContext) {
    this.prevCamPos = new THREE.Vector3();
  }

  /** Register a callback advanced once per frame before the draw decision. */
  onBeforeRender(fn: (delta: number) => void) {
    this.beforeRender.push(fn);
    return this;
  }

  /** Register a callback run once per frame after the draw decision. */
  onAfterRender(fn: () => void) {
    this.afterRender.push(fn);
    return this;
  }

  /** Register a predicate that forces a draw while it returns true. */
  addActivitySource(fn: () => boolean) {
    this.activitySources.push(fn);
    return this;
  }

  start() {
    this.stopLoop = false;
    // Seed prevCamPos offset from the real camera pose so the first frame
    // always renders, whatever the initial position is.
    this.prevCamPos.copy(this.ctx.camera.position).add(new THREE.Vector3(1, 0, 0));
    this.tick();
    return this;
  }

  stop() {
    this.stopLoop = true;
    return this;
  }

  private tick = () => {
    if (this.stopLoop) return;

    requestAnimationFrame(this.tick);

    // Per-frame delta time (seconds), shared by tweens, mixers and physics.
    const now = performance.now();
    const delta = this.lastFrameTime === undefined ? 0 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    for (const fn of this.beforeRender) fn(delta);

    const { scene, renderer, camera } = this.ctx;

    const cameraMoved =
      camera.position.x !== this.prevCamPos.x ||
      camera.position.y !== this.prevCamPos.y ||
      camera.position.z !== this.prevCamPos.z;

    if (cameraMoved || this.activitySources.some((fn) => fn()) || this.additionalRenderFn) {
      renderer.render(scene, camera);
    }

    this.prevCamPos.copy(camera.position);
    if (this.additionalRenderFn) this.additionalRenderFn();
    for (const fn of this.afterRender) fn();
  };
}
