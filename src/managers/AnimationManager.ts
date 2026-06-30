import * as THREE from "three";
import { Tween, Group, Easing } from "@tweenjs/tween.js";
import type { SceneContext } from "../core/SceneContext";
import type { RenderLoop } from "../core/RenderLoop";
import type { AssetLoader } from "./AssetLoader";
import type {
  AnimatedModel,
  AnimatedModelOptions,
  PlayAnimationOptions,
} from "../types";

/**
 * Owns all time-based animation: the per-instance tween group, registered
 * AnimationMixers, and the high-level model tween helpers (color/opacity/
 * position). It plugs a single before-render tick and two activity sources
 * into the {@link RenderLoop}, so the loop keeps drawing while anything here
 * is still moving.
 */
export class AnimationManager {
  // Per-instance tween group (tween.js, MIT). Advanced once per frame and
  // cleared on dispose, so tweens never leak across instances.
  private tweens: Group = new Group();

  // Animation mixers advanced once per frame. While at least one mixer is
  // registered the loop keeps drawing, so animations play smoothly.
  private mixers: THREE.AnimationMixer[] = [];

  // Count of in-flight tweens; the loop keeps drawing while it is non-zero.
  private animating: number = 0;

  constructor(
    private ctx: SceneContext,
    private loop: RenderLoop,
    private assets: AssetLoader,
  ) {
    this.loop.onBeforeRender((delta) => this.tick(delta));
    this.loop.addActivitySource(() => this.animating > 0);
    this.loop.addActivitySource(() => this.mixers.length > 0);
  }

  /** True while any tween or mixer is active (used by the render loop). */
  get isActive(): boolean {
    return this.animating > 0 || this.mixers.length > 0;
  }

  private tick(delta: number) {
    this.tweens.update();
    if (this.mixers.length) {
      for (const mixer of this.mixers) mixer.update(delta);
    }
  }

  /**
   * Tween numeric properties of a target object. Durations are in seconds; the
   * render loop keeps drawing while a tween is active, then stops once done.
   */
  tween<T extends Record<string, any>>(
    target: T,
    props: Partial<Record<keyof T, number>>,
    duration: number,
    onComplete?: () => void,
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

  /** Animate the color of a named model in the scene. */
  animateModelColor(name: string, color: string | number, duration = 2) {
    const obj = this.ctx.scene.getObjectByName(name);
    if (!obj) {
      console.warn(`Object with name "${name}" not found in scene`);
      return;
    }
    const rgbColor = new THREE.Color(color);
    obj.traverse((mesh) => {
      if (mesh instanceof THREE.Mesh) {
        this.tween(mesh.material.color, { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b }, duration);
      }
    });
  }

  /** Animate the opacity of a named model in the scene. */
  animateModelOpacity(name: string, value: number, duration = 2) {
    const obj = this.ctx.scene.getObjectByName(name);
    if (!obj) {
      console.warn(`Object with name "${name}" not found in scene`);
      return;
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
  }

  /** Animate the position of a named model in the scene. */
  animateModelPosition(name: string, newPosition: THREE.Vector3, duration = 2) {
    const obj = this.ctx.scene.getObjectByName(name);
    if (!obj) {
      console.warn(`Object with name "${name}" not found in scene`);
      return;
    }
    this.tween(obj.position, { x: newPosition.x, y: newPosition.y, z: newPosition.z }, duration);
  }

  /**
   * Register an AnimationMixer so it's advanced automatically every frame. The
   * loop keeps drawing while any mixer is registered.
   */
  addMixer(mixer: THREE.AnimationMixer) {
    if (!this.mixers.includes(mixer)) this.mixers.push(mixer);
  }

  /** Stop driving a previously-registered AnimationMixer. */
  removeMixer(mixer: THREE.AnimationMixer) {
    const i = this.mixers.indexOf(mixer);
    if (i !== -1) this.mixers.splice(i, 1);
  }

  /**
   * Load a rigged glTF/glb model, add it to the scene, and wire its animation
   * clips into the render loop. Keeps the original object (not a clone) so its
   * skeleton animates correctly, and returns a small handle to control playback.
   */
  async loadAnimatedModel(url: string, options: AnimatedModelOptions = {}): Promise<AnimatedModel> {
    const { add = true, shadows = true, autoplay } = options;

    const gltf = await this.assets.gltfLoader.loadAsync(url);
    const model = gltf.scene;

    if (shadows) {
      model.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    }
    if (add) this.ctx.scene.add(model);

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

  dispose() {
    this.tweens.removeAll();
    this.mixers.forEach((m) => m.stopAllAction());
    this.mixers = [];
    this.animating = 0;
  }
}
