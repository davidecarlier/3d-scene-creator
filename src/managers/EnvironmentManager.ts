import * as THREE from "three";
import type { SceneContext } from "../core/SceneContext";

/**
 * Owns the scene environment/background, i.e. the 360° skybox sphere. Kept
 * separate so background concerns don't bleed into lighting or asset loading.
 */
export class EnvironmentManager {
  private skybox?: THREE.Mesh;

  constructor(private ctx: SceneContext) {}

  /**
   * Add a skybox to the scene (360° background).
   * @param url - Optional URL to a 360° image texture
   * @param color - Fallback color if no texture URL is provided
   * @param name - Optional name for the skybox object
   */
  addSkybox(url?: string, color: THREE.ColorRepresentation = "#B2FFFF", name?: string) {
    const sphereGeom = new THREE.SphereGeometry(1000 * this.ctx.scale, 60, 60);
    sphereGeom.scale(-1, 1, 1);

    let sphereMaterial: THREE.Material;
    if (url) {
      THREE.TextureLoader.prototype.crossOrigin = "anonymous";
      sphereMaterial = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(url),
      });
    } else {
      sphereMaterial = new THREE.MeshStandardMaterial({ color });
    }

    const skybox = new THREE.Mesh(sphereGeom, sphereMaterial);
    skybox.name = name ? name : "skybox";
    this.ctx.scene.add(skybox);
    this.skybox = skybox;
  }

  dispose() {
    if (this.skybox) {
      this.skybox.removeFromParent();
      this.skybox.geometry.dispose();
      const material = this.skybox.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
      this.skybox = undefined;
    }
  }
}
