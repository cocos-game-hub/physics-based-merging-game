import { _decorator, Component, PhysicsSystem2D, Prefab } from 'cc';
import { container } from "db://assets/core/di/Container";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { MergedLogic } from "db://assets/modules/merged/logic/MergedLogic";
import logger from 'db://assets/core/utils/console';
import { PoolManager } from "db://assets/core/pool/PoolManager";

const { ccclass, property } = _decorator;

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    @property(Prefab) mergedPrefab: Prefab | null = null;

    start() {
        PhysicsSystem2D.instance.debugDrawFlags = 0;
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
    }
}