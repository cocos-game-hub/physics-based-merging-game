import { Node, Prefab, Vec3 } from 'cc';
import { ObjectPool } from "db://assets/core/pool/ObjectPool";

export class PoolManager {
    private _pools: Map<string, ObjectPool> = new Map();
    private _defaultContainer: Node | null = null;

    setDefaultContainer(container: Node): void {
        this._defaultContainer = container;
    }

    registerPool(key: string, prefab: Prefab, initialSize: number = 10, container?: Node): void {
        if (this._pools.has(key)) {
            console.warn(`[PoolManager] Pool "${ key }" already exists`);
            return;
        }

        const pool = new ObjectPool(key);
        const targetContainer = container || this._defaultContainer;
        if (!targetContainer) {
            throw new Error(`[PoolManager] No container for pool "${ key }"`);
        }

        pool.init(prefab, targetContainer, initialSize);
        this._pools.set(key, pool);
    }

    spawn(key: string, position?: Vec3): Node | null {
        const pool = this._pools.get(key);
        if (!pool) {
            console.error(`[PoolManager] Pool "${ key }" not found`);
            return null;
        }
        return pool.spawn(position);
    }

    despawn(key: string, node: Node): void {
        const pool = this._pools.get(key);
        if (!pool) {
            console.error(`[PoolManager] Pool "${ key }" not found`);
            node.destroy();
            return;
        }
        pool.despawn(node);
    }

    despawnAll(key: string): void {
        const pool = this._pools.get(key);
        if (!pool) {
            console.error(`[PoolManager] Pool "${ key }" not found`);
            return;
        }
        pool.despawnAll();
    }

    despawnAllPools(): void {
        this._pools.forEach(pool => pool.despawnAll());
    }

    getAllActiveNodes(key: string): Node[] {
        const pool = this._pools.get(key);
        if (!pool) {
            console.error(`[PoolManager] Pool "${ key }" not found`);
            return [];
        }
        return pool.getAllActiveNodes();
    }

// Важно: метод для получения ВСЕХ нод из пула (включая неактивные)
    getAllNodesFromPool(key: string): Node[] {
        const pool = this._pools.get(key);
        if (!pool) {
            console.error(`[PoolManager] Pool "${ key }" not found`);
            return [];
        }
        return pool.getAllNodes();
    }

    getPoolInfo(key?: string): any {
        if (key) {
            return this._pools.get(key)?.getInfo();
        }
        return Array.from(this._pools.values()).map(p => p.getInfo());
    }

    // Для отладки
    logAllPools(): void {
        console.group('[PoolManager] All Pools');
        this._pools.forEach((pool, key) => {
            const info = pool.getInfo();
            console.log(`${ key }:`, info);
        });
        console.groupEnd();
    }
}