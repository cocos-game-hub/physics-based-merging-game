import { _decorator, Button, Component, PhysicsSystem2D, Prefab } from 'cc';
import { container } from "db://assets/core/di/Container";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { MergedLogic } from "db://assets/modules/merged/logic/MergedLogic";
import logger from 'db://assets/core/utils/console';
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { yandexSdk } from "db://assets/core/api/yandex-game";
import { DEV } from 'cc/env';
import { Bootstrap } from "db://assets/core/Bootstrap";
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS } from "db://assets/core/event-bus/GameEvents";

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab) declare mergedPrefab: Prefab | null;
    @property(Button) declare resetButton: Button | null;

    start() {
        if (!DEV) {
            yandexSdk.gameEvents.gameReady();
        }

        this.resetButton.node.on(Button.EventType.CLICK, this.resetProgress, this);
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

    resetProgress() {
        eventBus.emit(GAME_EVENTS.GAMEPLAY.RESET);
        Bootstrap.getInstance().removeSavedData();
    }
}