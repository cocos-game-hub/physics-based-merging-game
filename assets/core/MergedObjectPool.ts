/*
import { CircleCollider2D, instantiate, Node, Prefab, RigidBody2D, Vec3 } from 'cc';
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";

export class MergedObjectPool {
    private _pool: Node[] = [];
    private _prefab: Prefab | null = null;
    private _container: Node | null = null;

    init(prefab: Prefab, container: Node, initialSize: number = 10): void {
        this._prefab = prefab;
        this._container = container;

        for (let i = 0; i < initialSize; i++) {
            const obj = this.createNew();
            obj.active = false;
            this._pool.push(obj);
        }
    }

    spawn(position: Vec3): Node {
        let node = this._pool.find(n => !n.active);

        if (!node) {
            node = this.createNew();
            this._pool.push(node);
        }

        node.active = true;
        node.setPosition(position);

        const obj = node.getComponent(MergedObject);
        if (obj) {
            obj.reset();
        }

        return node;
    }

    despawn(node: Node): void {
        if (!node || !node.isValid) return;

        const rigidBody = node.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = false;
        }

        const collider = node.getComponent(CircleCollider2D);
        if (collider) {
            collider.enabled = false;
        }

        node.active = false;

        // Сбрасываем позицию в "чистилище"
        node.setPosition(0, -10000, 0);

        node.removeFromParent();
    }

    reuseForMerge(node: Node, newPosition: Vec3): void {
        if (!node || !node.isValid) return;

        if (!node.parent) {
            node.parent = this._container;
        }

        node.active = true;
        node.setPosition(newPosition);

        const rigidBody = node.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = true;
        }

        const collider = node.getComponent(CircleCollider2D);
        if (collider) {
            collider.enabled = true;
        }
    }

    private createNew(): Node {
        if (!this._prefab) throw new Error('Pool not initialized');
        const node = instantiate(this._prefab);
        node.parent = this._container;
        return node;
    }
}*/
