import { _decorator, Component, Prefab, Vec3 } from 'cc';
import { container } from "db://assets/core/di/Container";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { MergedLogic } from "db://assets/modules/merged/logic/MergedLogic";
import { MergedData } from "db://assets/modules/merged/data/MergedData";
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";
import { randomInRange } from "db://assets/core/utils";
import logger from 'db://assets/core/utils/console';
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS } from "db://assets/core/event-bus/GameEvents";

const { ccclass, property } = _decorator;

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    @property(Prefab) mergedPrefab: Prefab | null = null;

    start() {
        logger.setDevMode(false);
        logger.setMinLevel('debug');
        logger.setEnabled(true);
        logger.info('powered by @hikkathon');

        const logic = new MergedLogic();
        container.set(SERVICE_KEYS.MERGED_LOGIC, logic);

        const poolManager = new PoolManager();
        container.set(SERVICE_KEYS.POOL_MANAGER, poolManager);

        poolManager.setDefaultContainer(this.node);
        if (this.mergedPrefab) {
            poolManager.registerPool('merged', this.mergedPrefab, 0);
        }

        // Тестовый спавн
        this.schedule(() => {
            const pos = new Vec3(
                randomInRange(-220, 220),
                randomInRange(-200, 200),
                0
            );

            const node = poolManager.spawn('merged', pos);
            if (!node) {
                logger.error('[GameBootstrap]', 'Failed to spawn merged object');
                return;
            }

            const mergedObj = node.getComponent(MergedObject);
            if (mergedObj) {
                const data = MergedData.fromVec3(node.uuid, 1, pos);
                mergedObj.setData(data);
                eventBus.emit(GAME_EVENTS.MERGE.OBJECT_CREATED, mergedObj);
            } else {
                logger.error('[GameBootstrap]', 'MergedObject component not found on spawned node');
            }
        }, 0.05, 4096, 0.05);
    }
}