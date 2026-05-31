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
