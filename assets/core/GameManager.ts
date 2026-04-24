import {
    _decorator,
    BoxCollider2D,
    Button,
    Collider2D,
    Component,
    Contact2DType,
    Label,
    PhysicsSystem2D,
    Prefab,
    RigidBody2D
} from 'cc';
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
import { MergedManager } from "db://assets/modules/merged/view/MergedManager";

const { ccclass, property } = _decorator;
const MAX_ACTIVATE_BALLS = 160;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab) declare mergedPrefab: Prefab | null;
    @property(Button) declare resetButton: Button | null;
    @property(BoxCollider2D) declare redLine: BoxCollider2D | null;
    @property(Label) declare redLabel: Label | null;

    private _activeCountBall = 0;

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

        this.redLine.getComponent(Collider2D).on(Contact2DType.BEGIN_CONTACT, this.redLineContact, this);
        eventBus.on(GAME_EVENTS.DROPPING.DROP, this.onDropping, this);

        poolManager.setDefaultContainer(this.node);
        if (this.mergedPrefab) {
            poolManager.registerPool('merged', this.mergedPrefab, 0);
        }

        switch (Bootstrap.getInstance().currentLang) {
            case 'ru':
                this.redLabel.string = `ШАРОВ СЛИШКОМ МНОГО`;
                break;
            case 'en':
                this.redLabel.string = `TOO MANY BALLS`;
                break;
            default:
                this.redLabel.string = `TOO MANY BALLS`;
                break;
        }

        this.scheduleOnce(() => {
            this.onDropping();
        }, 0);
    }

    redLineContact() {
        logger.info('redLineContact()');
        if (this._activeCountBall > MAX_ACTIVATE_BALLS) {
            this.scheduleOnce(async () => {
                await this.resetProgress();
            }, 0);
        }
    }

    async resetProgress() {
        eventBus.emit(GAME_EVENTS.GAMEPLAY.RESET);
        await Bootstrap.getInstance().removeSavedData();

        this.scheduleOnce(() => {
            this.onDropping();
        }, 0);
    }

    onDropping() {
        let poolInfo = MergedManager.getInstance().poolManager.getPoolInfo('merged');
        const isOverLimit = poolInfo.active >= MAX_ACTIVATE_BALLS;
        this._activeCountBall = poolInfo.active;
        if (this.redLine?.node) {
            this.redLine.node.active = isOverLimit;

            if (isOverLimit) {
                // Отложенное включение физических компонентов
                this.scheduleOnce(() => {
                    const boxCollider = this.redLine.getComponent(BoxCollider2D);
                    const rigidBody = this.redLine.getComponent(RigidBody2D);

                    if (boxCollider && this.redLine.node.active) {
                        boxCollider.enabled = true;
                    }
                    if (rigidBody && this.redLine.node.active) {
                        rigidBody.enabled = true;
                    }
                }, 0);
            } else {
                const boxCollider = this.redLine.getComponent(BoxCollider2D);
                const rigidBody = this.redLine.getComponent(RigidBody2D);

                if (boxCollider) boxCollider.enabled = false;
                if (rigidBody) rigidBody.enabled = false;
            }
        }
    }
}