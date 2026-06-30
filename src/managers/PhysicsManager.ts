import * as THREE from "three";
// Type-only import: the runtime module is loaded lazily in enablePhysics(), so
// projects that never call it don't pull cannon-es into their bundle.
import type * as CANNON from "cannon-es";
import type { RenderLoop } from "../core/RenderLoop";
import type { PhysicsOptions, PhysicsBodyOptions } from "../types";

/**
 * Owns optional rigid-body physics (powered by cannon-es, imported lazily).
 * When a world exists it's stepped every frame via the {@link RenderLoop} and
 * each linked mesh is synced from its body. Disabled by default and zero-cost
 * until {@link enablePhysics} is called.
 */
export class PhysicsManager {
  world?: CANNON.World;

  private bodies: { mesh: THREE.Object3D; body: CANNON.Body }[] = [];
  private fixedStep = 1 / 60;
  private maxSubSteps = 3;
  // The cannon-es module, loaded on demand by enablePhysics().
  private cannon?: typeof import("cannon-es");

  constructor(private loop: RenderLoop) {
    this.loop.onBeforeRender((delta) => this.tick(delta));
    this.loop.addActivitySource(() => !!this.world);
  }

  private tick(delta: number) {
    if (!this.world) return;
    this.world.step(this.fixedStep, delta, this.maxSubSteps);
    for (const { mesh, body } of this.bodies) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
  }

  /**
   * Enable rigid-body physics. cannon-es is imported lazily here, so this is
   * asynchronous: `await` it before calling {@link addBody} or {@link addGround}.
   */
  async enablePhysics(options: PhysicsOptions = {}) {
    if (this.world) return;

    const CANNON = (this.cannon ??= await import("cannon-es"));

    const g = options.gravity ?? new THREE.Vector3(0, -9.82, 0);
    const gravity = Array.isArray(g)
      ? new CANNON.Vec3(g[0], g[1], g[2])
      : new CANNON.Vec3(g.x, g.y, g.z);

    const world = new CANNON.World({ gravity });
    world.allowSleep = options.allowSleep ?? true;
    world.defaultContactMaterial.restitution = options.restitution ?? 0.3;
    world.defaultContactMaterial.friction = options.friction ?? 0.4;
    this.world = world;
  }

  /**
   * Give a mesh a rigid body and keep the two in sync each frame. The collision
   * shape is derived from the mesh's bounding box (or sphere) and its scale.
   */
  addBody(mesh: THREE.Object3D, options: PhysicsBodyOptions = {}) {
    if (!this.world || !this.cannon) {
      throw new Error("Call (and await) enablePhysics() before addBody().");
    }
    const CANNON = this.cannon;
    const { mass = 1, shape = "box", linearDamping = 0.01, angularDamping = 0.01 } = options;

    const body = new CANNON.Body({ mass, shape: this.shapeFromMesh(mesh, shape) });
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    body.quaternion.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
    body.linearDamping = linearDamping;
    body.angularDamping = angularDamping;

    this.world.addBody(body);
    if (mass > 0) this.bodies.push({ mesh, body });
    return body;
  }

  /** Add a static, infinite ground plane at the given height (default y = 0). */
  addGround(y: number = 0) {
    if (!this.world || !this.cannon) {
      throw new Error("Call (and await) enablePhysics() before addGround().");
    }
    const CANNON = this.cannon;
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    body.position.set(0, y, 0);
    this.world.addBody(body);
    return body;
  }

  /** Remove a body from the world and stop syncing its mesh. */
  removeBody(body: CANNON.Body) {
    if (this.world) this.world.removeBody(body);
    this.bodies = this.bodies.filter((b) => b.body !== body);
  }

  /** Build a cannon-es collision shape from a mesh's geometry and scale. */
  private shapeFromMesh(mesh: THREE.Object3D, shape: "box" | "sphere"): CANNON.Shape {
    const CANNON = this.cannon!;
    const geom = (mesh as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const s = mesh.scale;

    if (shape === "sphere") {
      if (geom && !geom.boundingSphere) geom.computeBoundingSphere();
      const radius = geom?.boundingSphere?.radius ?? 0.5;
      return new CANNON.Sphere(radius * Math.max(s.x, s.y, s.z));
    }

    const size = new THREE.Vector3(1, 1, 1);
    if (geom) {
      if (!geom.boundingBox) geom.computeBoundingBox();
      geom.boundingBox?.getSize(size);
    }
    return new CANNON.Box(new CANNON.Vec3((size.x * s.x) / 2, (size.y * s.y) / 2, (size.z * s.z) / 2));
  }

  dispose() {
    this.bodies = [];
    this.world = undefined;
  }
}
