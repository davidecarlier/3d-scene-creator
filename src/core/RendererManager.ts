import type { SceneContext } from "./SceneContext";
import type { RenderLoop } from "./RenderLoop";

/**
 * Owns the renderer/canvas lifecycle: container attachment, sizing, the window
 * resize listener, and teardown of the canvas + renderer. Keeps the WebGL
 * surface concerns in one place, away from camera, scene and physics logic.
 */
export class RendererManager {
  cWidth: number = 0;
  cHeight: number = 0;
  private onResize?: () => void;

  constructor(private ctx: SceneContext, private loop: RenderLoop) {
    this.installResizeListener();
  }

  /** Re-read the attached container's pixel dimensions. */
  resetSizes() {
    if (this.ctx.container) {
      this.cWidth = this.ctx.container.clientWidth;
      this.cHeight = this.ctx.container.clientHeight;
    }
  }

  private installResizeListener() {
    this.resetSizes();

    this.onResize = () => {
      this.resetSizes();
      const { camera, renderer } = this.ctx;
      camera.aspect = this.cWidth / this.cHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(this.cWidth, this.cHeight);
      // Nudge the camera so the loop's "did it move?" check forces a redraw.
      camera.position.x = camera.position.x + 0.001;
    };

    window.addEventListener("resize", this.onResize, false);
  }

  /** Attach the renderer's canvas to a DOM element and start rendering. */
  attachRenderer(container: HTMLElement) {
    const { ctx } = this;
    ctx.container = container;
    this.resetSizes();
    ctx.camera.aspect = this.cWidth / this.cHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(this.cWidth, this.cHeight);
    container.appendChild(ctx.renderer.domElement);
    ctx.scene.updateMatrixWorld(true);
    this.loop.start();
  }

  dispose() {
    if (this.onResize) {
      window.removeEventListener("resize", this.onResize);
      this.onResize = undefined;
    }
    const { renderer, container } = this.ctx;
    renderer.dispose();
    if (container && renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }
}
