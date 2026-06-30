import * as THREE from "three";
import type { SceneContext } from "../core/SceneContext";
import type { LightingOptions } from "../types";

/**
 * Owns scene lighting: builds the game-ready rig (hemisphere fill + key/fill
 * directional lights), configures shadow mapping and tone mapping on the
 * renderer, and toggles shadow casting/receiving on existing meshes.
 */
export class LightingManager {
  // Lights this manager added, so they can be removed/disposed on teardown.
  private lights: THREE.Light[] = [];

  constructor(private ctx: SceneContext) {}

  /**
   * Add a hemisphere fill, a shadow-casting key light, and an opposite fill
   * light, with optional ACES tone mapping. All parts are configurable.
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

    const { scene, renderer } = this.ctx;

    if (hemisphere) {
      const hemi = new THREE.HemisphereLight(
        hemisphere.sky ?? 0xbcd4ff,
        hemisphere.ground ?? 0x3a2c16,
        hemisphere.intensity ?? 1.4,
      );
      hemi.position.set(0, 20, 0);
      scene.add(hemi);
      this.lights.push(hemi);
    }

    const keyLight = new THREE.DirectionalLight(key.color ?? 0xfff2dd, key.intensity ?? 2.6);
    keyLight.position.copy(key.position ?? new THREE.Vector3(8, 16, 10));
    scene.add(keyLight);
    this.lights.push(keyLight);

    if (fill) {
      const fillLight = new THREE.DirectionalLight(fill.color ?? 0x9ec3ff, fill.intensity ?? 0.6);
      fillLight.position.copy(fill.position ?? new THREE.Vector3(-10, 8, -8));
      scene.add(fillLight);
      this.lights.push(fillLight);
    }

    if (shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = exposure;
    }
  }

  /**
   * Enable shadow casting/receiving on every mesh currently in the scene.
   * @param cast - Whether meshes cast shadows (default: true)
   * @param receive - Whether meshes receive shadows (default: true)
   */
  applyShadows(cast: boolean = true, receive: boolean = true) {
    this.ctx.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = cast;
        obj.receiveShadow = receive;
      }
    });
  }

  dispose() {
    for (const light of this.lights) {
      light.removeFromParent();
      light.dispose?.();
    }
    this.lights = [];
  }
}
