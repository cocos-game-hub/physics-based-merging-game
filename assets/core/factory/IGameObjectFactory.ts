import { Node, Prefab, Vec3 } from 'cc';

export interface IGameObjectFactory {
    instantiate(prefab: Prefab, parent?: Node): Node;

    destroy(node: Node): void;

    spawnAtPosition(prefab: Prefab, position: Vec3, parent?: Node): Node;

    getSceneRoot(): Node;
}