import * as THREE from "three";

/**
 * The small bag of Three.js primitives that every subsystem shares.
 *
 * Keeping these on a single object (instead of threading them through each
 * manager's constructor, or letting managers reach back into SceneCreator)
 * is what stops SceneCreator from becoming a god object: managers depend on
 * the context, never on each other's internals.
 *
 * `camera` is assigned by {@link CameraManager} during construction, and
 * `container` is assigned by {@link RendererManager} when the renderer is
 * attached. Both are read lazily by the managers that need them, so the
 * non-null assertion on `camera` is safe once wiring has completed.
 */
export class SceneContext {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  /** Set by CameraManager during construction. */
  camera!: THREE.PerspectiveCamera;
  /** Set by RendererManager once a container is attached. */
  container?: HTMLElement;
  /** World scale factor applied to camera frustum, distances and skybox size. */
  scale: number;

  constructor(scale: number = 1) {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.scale = scale;
  }
}
