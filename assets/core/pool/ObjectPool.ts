import { instantiate, Node, Prefab, RigidBody2D, Vec3 } from 'cc';

export class ObjectPool {
    private _pool: Node[] = [];
    private _prefab: Prefab | null = null;
    private _container: Node | null = null;
    private _name: string = 'Unknown';

    constructor(name: string = 'Pool') {
        this._name = name;
    }

    init(prefab: Prefab, container: Node, initialSize: number = 10): void {
        this._prefab = prefab;
        this._container = container;

        for (let i = 0; i < initialSize; i++) {
            this._pool.push(this.createNew());
        }
    }

    spawn(position?: Vec3): Node {
        // Очистка невалидных
        this._pool = this._pool.filter(n => n?.isValid);

        let node = this._pool.find(n => !n.active);
        if (!node) {
            node = this.createNew();
            this._pool.push(node);
        }

        // Включаем физику обратно
        const rigidBody = node.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = true;
        }

        node.active = true;
        if (position) node.setPosition(position);

        return node;
    }

    despawn(node: Node): void {
        if (!node?.isValid) return;

        // Отключаем физику если есть
        const rigidBody = node.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = false;
        }

        node.active = false;
        node.setPosition(0, -10000, 0);
    }

    getInfo() {
        return {
            name: this._name,
            total: this._pool.length,
            active: this._pool.filter(n => n?.isValid && n.active).length,
            inactive: this._pool.filter(n => n?.isValid && !n.active).length
        };
    }

    despawnAll(): void {
        this._pool.forEach(node => {
            if (node?.isValid) {
                // Отключаем физику
                const rigidBody = node.getComponent(RigidBody2D);
                if (rigidBody) {
                    rigidBody.enabled = false;
                }

                node.active = false;
                node.setPosition(0, -10000, 0);
            }
        });
    }

    getAllActiveNodes(): Node[] {
        return this._pool.filter(n => n?.isValid && n.active);
    }

    getAllNodes(): Node[] {
        return this._pool.filter(n => n?.isValid);
    }

    private createNew(): Node {
        if (!this._prefab) throw new Error(`Pool ${ this._name } not initialized`);
        if (!this._container) throw new Error(`Pool ${ this._name } has no container`);

        const node = instantiate(this._prefab);
        node.active = false;
        node.parent = this._container;
        return node;
    }
}