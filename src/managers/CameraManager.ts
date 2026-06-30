import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SceneContext } from "../core/SceneContext";
import type { AnimationManager } from "./AnimationManager";

/**
 * Owns the perspective camera and its scripted moves. Creates the camera (and
 * publishes it on the shared context), remembers its initial pose for resets,
 * and animates position/target changes through the {@link AnimationManager}.
 */
export class CameraManager {
  readonly initialCamPos: THREE.Vector3;
  readonly initialTargetPos: THREE.Vector3;

  constructor(
    private ctx: SceneContext,
    private animation: AnimationManager,
    private getControls: () => OrbitControls | undefined,
    camPos?: THREE.Vector3,
    targetPos?: THREE.Vector3,
  ) {
    const scale = ctx.scale;

    const camera = new THREE.PerspectiveCamera(50, 0, 0.1 * scale, 2000 * scale);

    this.initialCamPos = camPos ?? new THREE.Vector3(10 * scale, 10 * scale, 10 * scale);
    this.initialTargetPos = targetPos ?? new THREE.Vector3(0, 0, 0);

    camera.position.copy(this.initialCamPos);
    camera.lookAt(this.initialTargetPos);

    ctx.camera = camera;
  }

  get camera(): THREE.PerspectiveCamera {
    return this.ctx.camera;
  }

  /** Reset camera to its initial position with animation. */
  resetCameraPosition() {
    this.moveCamera(this.initialCamPos, this.initialTargetPos);
  }

  /**
   * Animate the camera to a new position (and optionally the controls target).
   * Controls are disabled during the move and restored on completion.
   */
  moveCamera(newPosCam: THREE.Vector3, newPosTarget?: THREE.Vector3, callback?: () => void) {
    const camera = this.ctx.camera;
    const controls = this.getControls();

    let reEnable: boolean | undefined;
    if (controls) {
      reEnable = controls.enabled;
      controls.enabled = false;
    }

    this.animation.tween(camera.position, { x: newPosCam.x, y: newPosCam.y, z: newPosCam.z }, 3, () => {
      if (controls && typeof reEnable === "boolean") controls.enabled = reEnable;
      if (typeof callback === "function") callback();
    });
    if (newPosTarget && controls) {
      this.animation.tween(controls.target, { x: newPosTarget.x, y: newPosTarget.y, z: newPosTarget.z }, 3);
    }
  }
}
