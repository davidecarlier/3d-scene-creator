import * as THREE from "three";
import type { SceneContext } from "../core/SceneContext";

type Listener = { target: EventTarget; type: string; handler: EventListener };

/**
 * Owns interactive object picking: the raycaster, pointer/touch bookkeeping,
 * and click-vs-drag discrimination. Registers its DOM listeners on the
 * attached container and tears them down on {@link dispose}.
 */
export class PickingManager {
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouse: THREE.Vector2 = new THREE.Vector2();
  selectedObject: THREE.Object3D | null = null;
  pickingEnabled: boolean = false;

  onObjectClick?: (obj: THREE.Object3D) => void;
  onObjectHover?: (obj: THREE.Object3D | null) => void;
  onObjectContextMenu?: (obj: THREE.Object3D) => void;

  // A pointer gesture only counts as a click if it moves less than this many
  // pixels between down and up.
  clickDragThreshold: number = 6;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private pointerDragging: boolean = false;

  // Registered DOM listeners, removed on dispose to avoid leaks.
  private listeners: Listener[] = [];

  constructor(private ctx: SceneContext) {}

  private on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
  ) {
    target.addEventListener(type, handler as EventListener);
    this.listeners.push({ target, type, handler: handler as EventListener });
  }

  /** Convert a client-space point to normalized device coordinates (-1..1). */
  private toNDC(clientX: number, clientY: number) {
    const rect = this.ctx.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersect() {
    this.raycaster.setFromCamera(this.mouse, this.ctx.camera);
    return this.raycaster.intersectObjects(this.ctx.scene.children, true);
  }

  /**
   * Enable interactive object picking with mouse/touch events.
   * @param onClickCallback - Callback when an object is clicked
   * @param onHoverCallback - Callback when the hovered object changes
   * @param onContextMenuCallback - Callback when an object is right-clicked
   */
  enablePicking(
    onClickCallback?: (object: THREE.Object3D) => void,
    onHoverCallback?: (object: THREE.Object3D | null) => void,
    onContextMenuCallback?: (object: THREE.Object3D) => void,
  ) {
    this.pickingEnabled = true;
    this.onObjectClick = onClickCallback;
    this.onObjectHover = onHoverCallback;
    this.onObjectContextMenu = onContextMenuCallback;

    const container = this.ctx.container;
    if (!container) {
      console.warn("Container not set. Picking requires attachRenderer to be called first.");
      return;
    }

    // Mouse move listener for hover detection
    this.on(container, "mousemove", (event: MouseEvent) => {
      this.toNDC(event.clientX, event.clientY);
      const intersects = this.intersect();

      if (intersects.length > 0) {
        const picked = intersects[0].object;
        if (picked !== this.selectedObject) {
          this.selectedObject = picked;
          if (this.onObjectHover) this.onObjectHover(picked);
        }
      } else if (this.selectedObject !== null) {
        this.selectedObject = null;
        if (this.onObjectHover) this.onObjectHover(null);
      }
    });

    // Track pointer gesture distance so an orbit/pan drag never fires a click.
    this.on(container, "pointerdown", (event: PointerEvent) => {
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
      this.pointerDragging = false;
    });
    this.on(container, "pointermove", (event: PointerEvent) => {
      if (this.pointerDragging) return;
      const dx = event.clientX - this.pointerDownX;
      const dy = event.clientY - this.pointerDownY;
      if (Math.hypot(dx, dy) > this.clickDragThreshold) {
        this.pointerDragging = true;
      }
    });

    // Mouse click listener (suppressed when the gesture was a drag)
    this.on(container, "click", () => {
      if (this.pointerDragging) return;
      if (this.selectedObject && this.onObjectClick) {
        this.onObjectClick(this.selectedObject);
      }
    });

    // Touch support for mobile devices: pick on touchend only if it was a tap.
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    this.on(container, "touchstart", (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchMoved = false;
      } else {
        touchMoved = true; // multi-touch = gesture, never a tap
      }
    });
    this.on(container, "touchmove", (event: TouchEvent) => {
      if (touchMoved || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;
      if (Math.hypot(dx, dy) > this.clickDragThreshold) touchMoved = true;
    });
    this.on(container, "touchend", (event: TouchEvent) => {
      if (touchMoved) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      this.toNDC(touch.clientX, touch.clientY);
      const intersects = this.intersect();
      if (intersects.length > 0 && this.onObjectClick) {
        this.onObjectClick(intersects[0].object);
      }
    });

    // Context menu (right-click) on the hovered object; default menu suppressed.
    this.on(container, "contextmenu", (event: MouseEvent) => {
      event.preventDefault();
      if (this.selectedObject && this.onObjectContextMenu) {
        this.onObjectContextMenu(this.selectedObject);
      }
    });
  }

  /** Disable interactive object picking. */
  disablePicking() {
    this.pickingEnabled = false;
    this.selectedObject = null;
    this.onObjectClick = undefined;
    this.onObjectHover = undefined;
  }

  /** Get the currently hovered/selected object. */
  getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  /**
   * Pick the object at a specific normalized mouse position (-1..1).
   * @returns PickingResult-like object if something was hit, else null
   */
  pickAt(mouseX: number, mouseY: number) {
    this.mouse.set(mouseX, mouseY);
    const intersects = this.intersect();

    if (intersects.length > 0) {
      const intersection = intersects[0] as any;
      return {
        object: intersection.object,
        distance: intersection.distance,
        point: intersection.point,
        normal: intersection.normal || new THREE.Vector3(0, 1, 0),
        uv: intersection.uv || undefined,
      };
    }
    return null;
  }

  dispose() {
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler);
    }
    this.listeners = [];
    this.disablePicking();
  }
}
