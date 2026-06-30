import * as THREE from "three";
import type { SceneContext } from "../core/SceneContext";
import type {
  PickingOptions,
  PickEvent,
  PickSourceEvent,
  LegacyClickCallback,
  LegacyHoverCallback,
} from "../types";

type Listener = { target: EventTarget; type: string; handler: EventListener };

/**
 * Owns interactive object picking: the raycaster, hover/enter/leave tracking,
 * pointer/touch bookkeeping and click-vs-drag discrimination.
 *
 * Listeners are bound by {@link enablePicking} and fully removed by
 * {@link disablePicking} (and {@link dispose}), so toggling picking on and off
 * never leaks handlers. Callbacks receive a typed {@link PickEvent} carrying the
 * object **by reference**, the full raycast intersection, and the original DOM
 * event — so consumers don't have to rely on `object.name`.
 */
export class PickingManager {
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouse: THREE.Vector2 = new THREE.Vector2();
  selectedObject: THREE.Object3D | null = null;
  pickingEnabled: boolean = false;

  // A pointer gesture only counts as a click if it moves less than this many
  // pixels between down and up.
  clickDragThreshold: number = 6;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private pointerDragging: boolean = false;

  // Touch tap discrimination state.
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchMoved: boolean = false;

  // Active handlers + tuning for the current enablePicking() session.
  private handlers: PickingOptions = {};
  private recursive: boolean = true;
  private filter?: (object: THREE.Object3D) => boolean;

  // Registered DOM listeners, removed on disablePicking()/dispose().
  private listeners: Listener[] = [];

  constructor(private ctx: SceneContext) {}

  // --- raycasting helpers ----------------------------------------------------

  /** Convert a client-space point to normalized device coordinates (-1..1). */
  private toNDC(clientX: number, clientY: number) {
    const rect = this.ctx.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /** Nearest intersection under a client point that passes the filter, or null. */
  private raycast(clientX: number, clientY: number): THREE.Intersection | null {
    this.toNDC(clientX, clientY);
    this.raycaster.setFromCamera(this.mouse, this.ctx.camera);
    const hits = this.raycaster.intersectObjects(this.ctx.scene.children, this.recursive);
    if (!this.filter) return hits[0] ?? null;
    for (const hit of hits) {
      if (this.filter(hit.object)) return hit;
    }
    return null;
  }

  private makeEvent<E extends PickSourceEvent>(
    intersection: THREE.Intersection,
    originalEvent: E,
  ): PickEvent<E> {
    return { object: intersection.object, intersection, originalEvent };
  }

  // --- listener registration -------------------------------------------------

  private on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
  ) {
    target.addEventListener(type, handler as EventListener);
    this.listeners.push({ target, type, handler: handler as EventListener });
  }

  private removeListeners() {
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler);
    }
    this.listeners = [];
  }

  // --- public API ------------------------------------------------------------

  /**
   * Enable interactive object picking. Accepts either a typed options object
   * (recommended) or the legacy positional form
   * `(onClick, onHover, onContextMenu)` for backward compatibility.
   */
  enablePicking(options?: PickingOptions): void;
  enablePicking(
    onClick?: LegacyClickCallback,
    onHover?: LegacyHoverCallback,
    onContextMenu?: LegacyClickCallback,
  ): void;
  enablePicking(
    a?: PickingOptions | LegacyClickCallback,
    b?: LegacyHoverCallback,
    c?: LegacyClickCallback,
  ): void {
    // Re-binding: drop any previous session's listeners first.
    this.removeListeners();

    this.handlers = a && typeof a === "object" ? a : this.adaptLegacy(a, b, c);
    this.recursive = this.handlers.recursive ?? true;
    this.filter = this.handlers.filter;
    this.pickingEnabled = true;
    this.selectedObject = null;

    const container = this.ctx.container;
    if (!container) {
      console.warn("Container not set. Picking requires attachRenderer to be called first.");
      return;
    }

    // Hover / enter / leave (mouse + pen). Touch has no hover, so skip it.
    this.on(container, "pointermove", (event: PointerEvent) => {
      // Drag discrimination runs for every pointer type.
      if (!this.pointerDragging) {
        const dx = event.clientX - this.pointerDownX;
        const dy = event.clientY - this.pointerDownY;
        if (Math.hypot(dx, dy) > this.clickDragThreshold) this.pointerDragging = true;
      }
      if (event.pointerType === "touch") return;
      this.updateHover(this.raycast(event.clientX, event.clientY), event);
    });

    // Pointer left the canvas entirely → clear any active hover.
    this.on(container, "pointerleave", (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      this.updateHover(null, event);
    });

    this.on(container, "pointerdown", (event: PointerEvent) => {
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
      this.pointerDragging = false;
    });

    // Click (suppressed when the gesture was a drag). Re-raycast at the click
    // point so the reported object/intersection are fresh and accurate.
    this.on(container, "click", (event: MouseEvent) => {
      if (this.pointerDragging) return;
      const hit = this.raycast(event.clientX, event.clientY);
      if (hit && this.handlers.onClick) this.handlers.onClick(this.makeEvent(hit, event));
    });

    // Right-click / context menu (default browser menu suppressed).
    this.on(container, "contextmenu", (event: MouseEvent) => {
      event.preventDefault();
      const hit = this.raycast(event.clientX, event.clientY);
      if (hit && this.handlers.onContextMenu) this.handlers.onContextMenu(this.makeEvent(hit, event));
    });

    // Touch: fire onClick on a tap (touchend with negligible movement).
    this.on(container, "touchstart", (event: TouchEvent) => {
      if (event.touches.length === 1) {
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.touchMoved = false;
      } else {
        this.touchMoved = true; // multi-touch = gesture, never a tap
      }
    });
    this.on(container, "touchmove", (event: TouchEvent) => {
      if (this.touchMoved || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - this.touchStartX;
      const dy = event.touches[0].clientY - this.touchStartY;
      if (Math.hypot(dx, dy) > this.clickDragThreshold) this.touchMoved = true;
    });
    this.on(container, "touchend", (event: TouchEvent) => {
      if (this.touchMoved) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const hit = this.raycast(touch.clientX, touch.clientY);
      if (hit && this.handlers.onClick) this.handlers.onClick(this.makeEvent(hit, event));
    });
  }

  /** Disable picking and remove every event listener it registered. */
  disablePicking() {
    this.removeListeners();
    this.pickingEnabled = false;
    this.selectedObject = null;
    this.handlers = {};
    this.filter = undefined;
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
    this.raycaster.setFromCamera(this.mouse, this.ctx.camera);
    const hits = this.raycaster.intersectObjects(this.ctx.scene.children, this.recursive);
    const intersection = this.filter ? hits.find((h) => this.filter!(h.object)) : hits[0];

    if (intersection) {
      const i = intersection as any;
      return {
        object: i.object,
        distance: i.distance,
        point: i.point,
        normal: i.normal || new THREE.Vector3(0, 1, 0),
        uv: i.uv || undefined,
      };
    }
    return null;
  }

  dispose() {
    this.disablePicking();
  }

  // --- internals -------------------------------------------------------------

  /**
   * Diff the newly-hovered object against the current one and fire
   * leave/enter/hover callbacks accordingly. Comparison is by object identity,
   * never by name.
   */
  private updateHover(hit: THREE.Intersection | null, event: MouseEvent | PointerEvent) {
    const next = hit?.object ?? null;
    if (next === this.selectedObject) return;

    const prev = this.selectedObject;
    if (prev && this.handlers.onLeave) this.handlers.onLeave(prev, event);

    this.selectedObject = next;

    if (next && hit && this.handlers.onEnter) {
      this.handlers.onEnter(this.makeEvent(hit, event));
    }
    if (this.handlers.onHover) {
      this.handlers.onHover(next && hit ? this.makeEvent(hit, event) : null);
    }
  }

  /** Wrap the legacy positional callbacks into the typed handler shape. */
  private adaptLegacy(
    onClick?: LegacyClickCallback,
    onHover?: LegacyHoverCallback,
    onContextMenu?: LegacyClickCallback,
  ): PickingOptions {
    return {
      onClick: onClick ? (e) => onClick(e.object) : undefined,
      onHover: onHover ? (e) => onHover(e?.object ?? null) : undefined,
      onContextMenu: onContextMenu ? (e) => onContextMenu(e.object) : undefined,
    };
  }
}
