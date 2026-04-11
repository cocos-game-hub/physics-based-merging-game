/*
import { director, instantiate, Node, Prefab, Vec3 } from 'cc';
import { IGameObjectFactory } from './IGameObjectFactory';

export class GameObjectFactory implements IGameObjectFactory {
    private readonly _sceneRoot: Node;

    constructor() {
        this._sceneRoot = director.getScene();
    }

    instantiate(prefab: Prefab, parent?: Node): Node {
        const node = instantiate(prefab);
        const targetParent = parent || this._sceneRoot;
        targetParent.addChild(node);
        return node;
    }

    spawnAtPosition(prefab: Prefab, position: Vec3, parent?: Node): Node {
        const node = this.instantiate(prefab, parent);
        node.setPosition(position);
        return node;
    }

    destroy(node: Node): void {
        node.destroy();
    }

    getSceneRoot(): Node {
        return this._sceneRoot;
    }
}*/
