import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { SceneContext } from "../core/SceneContext";

/**
 * Loads models into the scene. Owns the lazily-created, shared GLTFLoader and a
 * per-URL cache of parsed glTF scenes so the same asset is only fetched and
 * parsed once. The shared loader is exposed to {@link AnimationManager} so
 * rigged-model loading reuses the same instance.
 */
export class AssetLoader {
  private _gltfLoader?: GLTFLoader;
  private gltfCache: Map<string, Promise<THREE.Group>> = new Map();

  constructor(private ctx: SceneContext) {}

  /** The shared, lazily-created GLTFLoader (also used for animated models). */
  get gltfLoader(): GLTFLoader {
    return (this._gltfLoader ??= new GLTFLoader());
  }

  /**
   * Load a 3D model from a URL and add it to the scene.
   * @param url - URL to the model file
   * @param loader - Optional THREE.js loader (default: ObjectLoader)
   */
  loadModel(url: string, loader?: THREE.Loader): Promise<THREE.Object3D> {
    if (!url) {
      return Promise.reject(new Error("URL is required"));
    }

    if (!loader) {
      loader = new THREE.ObjectLoader();
    }

    return loader
      .loadAsync(url)
      .then((obj: unknown) => {
        const object = obj as THREE.Object3D;
        this.ctx.scene.add(object);
        return object;
      })
      .catch((error) => {
        console.error(`Failed to load model from "${url}":`, error);
        throw error;
      });
  }

  /**
   * Load a glTF/glb model and return a fresh clone of its scene (not added to
   * the scene graph). Results are cached per URL, so loading the same model
   * many times only fetches/parses it once.
   * @param url - URL to the .glb/.gltf file
   */
  loadGLTF(url: string): Promise<THREE.Group> {
    let pending = this.gltfCache.get(url);
    if (!pending) {
      pending = this.gltfLoader.loadAsync(url).then((gltf) => gltf.scene);
      // Don't cache failures: drop the rejected promise so a later call can retry.
      pending.catch(() => this.gltfCache.delete(url));
      this.gltfCache.set(url, pending);
    }
    return pending.then((scene) => scene.clone(true));
  }

  dispose() {
    this.gltfCache.clear();
    this._gltfLoader = undefined;
  }
}
