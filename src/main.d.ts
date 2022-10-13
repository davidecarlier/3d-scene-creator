import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
declare class SceneCreator {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    container: HTMLElement | undefined;
    cWidth: number;
    cHeight: number;
    camera: THREE.PerspectiveCamera;
    initialCamPos: THREE.Vector3;
    initialTargetPos: THREE.Vector3;
    prevCamPos: THREE.Vector3;
    controls: OrbitControls | undefined;
    additionalRenderFn: Function | undefined;
    stopLoop: boolean;
    scale: number;
    animating: number;
    constructor(container?: HTMLElement, scale?: number, camPos?: THREE.Vector3, targetPos?: THREE.Vector3);
    addControls(overrides?: {}): this;
    /**
     * Set a callback function
     * for the renderer
     */
    setAdditionalRenderFn(fn: Function): void;
    resetSizes(): void;
    animateModelColor(name: string, color: string | number, duration?: number): this;
    animateModelOpacity(name: string, value: number, duration?: number): this;
    animateModelPosition(name: string, newPosition: THREE.Vector3, duration?: number): this;
    attachRenderer(container: HTMLElement): this;
    addLighting(): this;
    addSkybox(url?: string, color?: string, name?: string): this;
    resizeListener(): void;
    stopRenderLoop(): this;
    startRenderLoop(): this;
    renderLoop(): void;
    resetCameraPosition(): void;
    moveCamera(newPosCam: THREE.Vector3, newPosTarget: THREE.Vector3, callback?: Function): this;
    loadModel(url: string, loader?: any, callback?: Function): this;
    loadScene(url: string, callback?: Function): this;
}
export default SceneCreator;
