import { _decorator, Prefab, RigidBody2D, Vec2, Vec3 } from 'cc';
import { MergedObject } from './MergedObject';
import { MergedLogic } from '../logic/MergedLogic';
import { GAME_EVENTS, MergeCollisionEvent, MergeExecuteEvent } from 'db://assets/core/event-bus/GameEvents';
import { eventBus } from 'db://assets/core/event-bus/EventBus';
import { container } from "db://assets/core/di/Container";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { randomInRange } from "db://assets/core/utils";
import logger from "db://assets/core/utils/console";
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { SingletonComponent } from "db://assets/core/utils/SingletonComponent";

const { ccclass, property } = _decorator;

@ccclass('MergedManager')
export class MergedManager extends SingletonComponent<MergedManager> {
    @property(Prefab) mergedPrefab: Prefab | null = null;
    private _poolManager: PoolManager | null = null;
    private _logic: MergedLogic | null = null;
    private _objectMap: Map<string, MergedObject> = new Map();

    start() {
        logger.debug('[MergedManager]', 'start');

        logger.debug('[MergedManager]', 'Dependencies:', {
            prefab: !!this.mergedPrefab,
            container: !!container,
            logic: !!container.get(SERVICE_KEYS.MERGED_LOGIC)
        });

        this._logic = container.get(SERVICE_KEYS.MERGED_LOGIC);
        this._poolManager = container.get(SERVICE_KEYS.POOL_MANAGER);

        eventBus.on(GAME_EVENTS.MERGE.OBJECT_CREATED, this.onObjectCreated, this);
        eventBus.on(GAME_EVENTS.MERGE.COLLISION, this.onMergeCollision, this);
        eventBus.on(GAME_EVENTS.MERGE.EXECUTE, this.onMergeExecute, this);

        logger.debug('[MergedManager]', 'Subscribed to events');
    }

    onObjectCreated(obj: MergedObject) {
        this.registerObject(obj);
    }

    onDestroy() {
        eventBus.off(GAME_EVENTS.MERGE.COLLISION, this.onMergeCollision, this);
        eventBus.off(GAME_EVENTS.MERGE.EXECUTE, this.onMergeExecute, this);
    }

    registerObject(obj: MergedObject): void {
        if (obj.data) {
            this._objectMap.set(obj.data.uuid, obj);
        }
    }

    getObjectMap() {
        return this._objectMap;
    }

    private onMergeCollision(event: MergeCollisionEvent): void {
        logger.debug('[MergedManager]', 'MERGE_COLLISION received', {
            dataA: event.dataA,
            dataB: event.dataB
        });

        if (!this._logic) {
            logger.error('[MergedManager]', 'Logic is null!');
            return;
        }

        this._logic.handleCollision(event.dataA, event.dataB);

        if (event.objectA) event.objectA.resetProcessing();
        if (event.objectB) event.objectB.resetProcessing();
    }

    private onMergeExecute(event: MergeExecuteEvent): void {
        logger.debug('[MergedManager]', 'MERGE_EXECUTE received', event);

        if (event.oldUuids.length < 2) {
            logger.error('[MergedManager]', 'Not enough old UUIDs');
            return;
        }

        // Проверяем наличие объектов
        const objA = this._objectMap.get(event.oldUuids[0]);
        const objB = this._objectMap.get(event.oldUuids[1]);

        logger.debug('[MergedManager]', {
            objA: !!objA,
            objB: !!objB,
            objAValid: objA?.node?.isValid,
            objBValid: objB?.node?.isValid,
            mapSize: this._objectMap.size,
            mapKeys: Array.from(this._objectMap.keys())
        });

        if (!objA || !objB) {
            logger.warn('[MergedManager]', this.getObjectMap());
            logger.error('[MergedManager]', 'Objects not found in map!');
            return;
        }

        const nodeA = objA.node;
        const nodeB = objB.node;

        if (!nodeA.isValid || !nodeB.isValid) {
            logger.error('[MergedManager]', 'Nodes are invalid');
            return;
        }

        logger.debug('[MergedManager]', 'Performing merge with reuse');

        // Удаляем из карты
        this._objectMap.delete(event.oldUuids[0]);
        this._objectMap.delete(event.oldUuids[1]);

        // Деактивируем B
        logger.debug('[MergedManager]', 'Despawning nodeB');
        this._poolManager.despawn('merged', nodeB);

        // Переиспользуем A
        const newPosition = new Vec3(event.position.x, event.position.y, 0);
        logger.debug('[MergedManager]', 'Reusing nodeA at position', newPosition);

        objA.setData(event.newData);

        const rigidBody = nodeA.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.linearVelocity = new Vec2(0, 0);
            rigidBody.applyLinearImpulseToCenter(new Vec2(randomInRange(-20, 20), randomInRange(0, 20)), true);
        }

        this._objectMap.set(event.newData.uuid, objA);

        logger.debug('[MergedManager]', 'Merge complete. New UUID:', event.newData.uuid);
        logger.debug('[MergedManager]', 'Map after merge:', Array.from(this._objectMap.keys()));
    }
}