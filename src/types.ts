import * as THREE from 'three';

/**
 * Configuration options for initializing SceneCreator
 */
export interface SceneCreatorOptions {
  /** HTML container element to attach renderer to */
  container?: HTMLElement;
  /** Scale factor for the scene (default: 1) */
  scale?: number;
  /** Initial camera position (default: 10, 10, 10) */
  camPos?: THREE.Vector3;
  /** Initial camera target position (default: 0, 0, 0) */
  targetPos?: THREE.Vector3;
}

/**
 * A single directional light spec (color, intensity, position).
 */
export interface DirectionalLightSpec {
  color?: THREE.ColorRepresentation;
  intensity?: number;
  position?: THREE.Vector3;
}

/**
 * Options for {@link SceneCreator.addLighting}.
 */
export interface LightingOptions {
  /** Sky/ground ambient fill. Set to false to omit. */
  hemisphere?:
    | false
    | {
        sky?: THREE.ColorRepresentation;
        ground?: THREE.ColorRepresentation;
        intensity?: number;
      };
  /** Main directional light (casts shadows when `shadows` is on). */
  key?: DirectionalLightSpec;
  /** Opposite-side fill light to soften shadows. Set to false to omit. */
  fill?: false | DirectionalLightSpec;
  /** Enable shadow mapping on the renderer and the key light (default: true). */
  shadows?: boolean;
  /** Half-size of the key light's orthographic shadow frustum (default: 16). */
  shadowArea?: number;
  /** Shadow map resolution (default: 2048). */
  shadowMapSize?: number;
  /** Apply ACES Filmic tone mapping (default: true). */
  toneMapping?: boolean;
  /** Tone mapping exposure (default: 1.05). */
  exposure?: number;
}

/**
 * Configuration overrides for OrbitControls
 */
export interface OrbitControlsConfig {
  enabled?: boolean;
  enableDamping?: boolean;
  dampingFactor?: number;
  maxPolarAngle?: number;
  maxDistance?: number;
  minDistance?: number;
  rotateSpeed?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  [key: string]: any;
}

/**
 * Animation configuration for model animations
 */
export interface AnimationConfig {
  /** Animation duration in seconds */
  duration?: number;
  /** Easing function for animation */
  easing?: string;
  /** Callback on animation completion */
  onComplete?: () => void;
}

/**
 * Options for {@link SceneCreator.loadAnimatedModel}.
 */
export interface AnimatedModelOptions {
  /** Add the loaded model to the scene graph (default: true). */
  add?: boolean;
  /** Flag every mesh as a shadow caster/receiver (default: true). */
  shadows?: boolean;
  /** Name of the clip to start playing immediately (default: first clip). */
  autoplay?: string | false;
}

/**
 * Options for {@link AnimatedModel.play}.
 */
export interface PlayAnimationOptions {
  /** Cross-fade duration from the current clip, in seconds (default: 0.3). */
  fade?: number;
  /** Loop the clip (default: true). When false the clip plays once. */
  loop?: boolean;
  /** Hold the final frame when a non-looping clip finishes (default: true). */
  clampWhenFinished?: boolean;
}

/**
 * Handle returned by {@link SceneCreator.loadAnimatedModel} for controlling a
 * loaded, rigged glTF model and its animation clips.
 */
export interface AnimatedModel {
  /** The loaded model root (added to the scene unless `add: false`). */
  model: THREE.Group;
  /** The model's animation clips, as parsed from the glTF. */
  animations: THREE.AnimationClip[];
  /** Names of every available clip. */
  names: string[];
  /** The AnimationMixer driving this model (already wired into the render loop). */
  mixer: THREE.AnimationMixer;
  /** Ready-to-use actions, keyed by clip name. */
  actions: Record<string, THREE.AnimationAction>;
  /** Cross-fade to a clip by name. Returns the action, or null if not found. */
  play(name: string, options?: PlayAnimationOptions): THREE.AnimationAction | null;
  /** Fade the current clip out (default duration: 0.3s). */
  stop(fade?: number): void;
}

/**
 * Options for {@link SceneCreator.enablePhysics}.
 */
export interface PhysicsOptions {
  /** World gravity, as a Vector3 or [x, y, z] (default: [0, -9.82, 0]). */
  gravity?: THREE.Vector3 | [number, number, number];
  /** Default bounciness for all contacts, 0 to 1 (default: 0.3). */
  restitution?: number;
  /** Default friction for all contacts (default: 0.4). */
  friction?: number;
  /** Let resting bodies fall asleep to save CPU (default: true). */
  allowSleep?: boolean;
}

/**
 * Options for {@link SceneCreator.addBody}.
 */
export interface PhysicsBodyOptions {
  /** Body mass in kg. Use 0 for a static (immovable) body (default: 1). */
  mass?: number;
  /** Collision shape derived from the mesh (default: "box"). */
  shape?: "box" | "sphere";
  /** Linear movement damping, 0 to 1 (default: 0.01). */
  linearDamping?: number;
  /** Angular (spin) damping, 0 to 1 (default: 0.01). */
  angularDamping?: number;
}

/**
 * Result from raycasting/picking an object
 */
export interface PickingResult {
  /** The intersected 3D object */
  object: THREE.Object3D;
  /** Distance from camera to intersection point */
  distance: number;
  /** Intersection point in 3D space */
  point: THREE.Vector3;
  /** Normal vector at intersection point */
  normal: THREE.Vector3;
  /** UV coordinates if available */
  uv?: THREE.Vector2;
}

/**
 * Mouse position in normalized coordinates (-1 to 1)
 */
export interface MouseNormalized {
  x: number;
  y: number;
}

/** The original DOM event behind a pick (mouse, pointer or touch). */
export type PickSourceEvent = MouseEvent | PointerEvent | TouchEvent;

/**
 * Payload handed to every picking callback. Carries the picked object **by
 * reference** plus the full raycast {@link https://threejs.org/docs/#api/en/core/Raycaster.intersectObject Intersection}
 * (point, face, distance, uv, instanceId, …) and the original DOM event, so you
 * never have to identify objects by `name` alone.
 */
export interface PickEvent<E extends PickSourceEvent = PickSourceEvent> {
  /** The picked object (the nearest hit that passed the optional filter). */
  object: THREE.Object3D;
  /** The full Three.js intersection record for the hit. */
  intersection: THREE.Intersection;
  /** The DOM event that triggered the pick. */
  originalEvent: E;
}

/** Callback for click / right-click style picks. */
export type PickCallback<E extends PickSourceEvent = PickSourceEvent> = (event: PickEvent<E>) => void;

/** Callback fired when the pointer enters a different object (or leaves all). */
export type HoverCallback = (event: PickEvent<MouseEvent | PointerEvent> | null) => void;

/** Callback fired when the pointer leaves a previously-hovered object. */
export type LeaveCallback = (object: THREE.Object3D, originalEvent: MouseEvent | PointerEvent) => void;

/**
 * Handlers + tuning for {@link SceneCreator.enablePicking}. Pass any subset.
 */
export interface PickingOptions {
  /** Primary (left) click on an object. */
  onClick?: PickCallback<MouseEvent | TouchEvent>;
  /** Right-click / context menu on an object (default browser menu suppressed). */
  onContextMenu?: PickCallback<MouseEvent>;
  /** Hover changed: receives the newly-hovered object, or `null` when none. */
  onHover?: HoverCallback;
  /** Pointer entered an object (transition from none/other → this object). */
  onEnter?: PickCallback<MouseEvent | PointerEvent>;
  /** Pointer left a previously-hovered object. */
  onLeave?: LeaveCallback;
  /** Recurse into children when raycasting (default: true). */
  recursive?: boolean;
  /**
   * Only consider objects for which this returns true — e.g. tag pickable
   * meshes via `userData` instead of relying on `name`:
   * `filter: (o) => o.userData.pickable === true`.
   */
  filter?: (object: THREE.Object3D) => boolean;
}

/** Legacy positional click callback (kept for backward compatibility). */
export type LegacyClickCallback = (object: THREE.Object3D) => void;
/** Legacy positional hover callback (kept for backward compatibility). */
export type LegacyHoverCallback = (object: THREE.Object3D | null) => void;
