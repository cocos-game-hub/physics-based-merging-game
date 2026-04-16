import { _decorator, Button, Camera, Canvas, Component, EventTouch, Input, input, Sprite, Vec2, Vec3 } from 'cc';
import logger from 'db://assets/core/utils/console';
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";
import { MergedColor, MergedData } from "db://assets/modules/merged/data/MergedData";
import {
    clamp,
    convertTouchToWorldPos,
    convertWorldToCanvasPos,
    createCocosDebounce,
    createCocosThrottle,
    getRandomEnumKey
} from "db://assets/core/utils";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { container } from "db://assets/core/di/Container";
import { Bootstrap } from "db://assets/core/Bootstrap";
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS } from "db://assets/core/event-bus/GameEvents";

const { ccclass, property } = _decorator;

// ============= КОНСТАНТЫ =============
const HANDLER_POSITION = {
    X_MIN: -320,
    X_MAX: 320,
    Y: 440,
    Z: 0
} as const;

const NEXT_OBJECT_POSITION = {
    X: 0,
    Y: 565,
    Z: 0
} as const;

const COOLDOWN = {
    DURATION: 0.5,
    DISPLAY_PRECISION: 1
} as const;

const POOL_KEYS = {
    MERGED: 'merged'
} as const;

const DEFAULT_LEVEL = 1;
const DEFAULT_SCALE = 1;
const SCALE_ANIMATION_DURATION = 0.25;
const SCALE_ANIMATION_DELAY = 0.25;
const SAVE_DEBOUNCE_DELAY = 3.5;
const SAVE_THROTTLE_INTERVAL = 3.5;

@ccclass('MouseHandler')
export class MouseHandler extends Component {
    @property(Sprite) declare handHandler: Sprite | null;
    @property(Canvas) declare canvas: Canvas | null;
    @property(Camera) declare gameCamera: Camera | null;
    @property(Button) declare swapBtn: Button | null;
    private _pos: Vec2 = new Vec2(0, 0);

    // Cooldown timer
    private _canDrop = true;
    private _cooldownTime: number = COOLDOWN.DURATION;
    private _currentCooldown: number = 0;
    private _poolManager: PoolManager | null;

    // Храним данные вместо ссылок на объекты
    private _currentObjectData: MergedData | null = null;
    private _nextObjectData: MergedData | null = null;

    // Кэш для быстрого доступа к активным объектам (опционально)
    private _currentObjectInstance: MergedObject | null = null;
    private _nextObjectInstance: MergedObject | null = null;

    private _saved: MergedData[] | null = null;
    private debouncedSave: () => void;

    private throttledSave: () => void;
    private saveCounter: number = 0;


    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);

        eventBus.on(GAME_EVENTS.MERGE.EXECUTE, this.onSaved, this);
        eventBus.on(GAME_EVENTS.MERGE.COLLISION, this.onSaved, this);
        eventBus.on(GAME_EVENTS.GAMEPLAY.RESET, this.clear, this);

        this.swapBtn.node.on(Button.EventType.CLICK, this.onSwap, this);

        this.debouncedSave = createCocosDebounce(() => {
            this.saveAllObjects();
        }, SAVE_DEBOUNCE_DELAY, this);

        this.throttledSave = createCocosThrottle(() => {
            this.saveCounter++;
            this.saveAllObjects();
        }, SAVE_THROTTLE_INTERVAL, this);
    }

    start() {
        this._saved = Bootstrap.getInstance().savedData.MergedData;

        this._poolManager = container.get<PoolManager>(SERVICE_KEYS.POOL_MANAGER);

        if (!this.gameCamera) {
            this.gameCamera = this.canvas?.node.scene.getComponentInChildren(Camera);
        }

        // Очищаем сцену перед восстановлением
        this.clearAllMergedObjects();

        // Восстанавливаем ВСЕ объекты из сохранения
        if (this._saved && this._saved.length > 0) {
            logger.debug('[MouseHandler]', `Found ${ this._saved.length } saved objects`);
            this.restoreAllObjectsFromSave();
        } else {
            logger.debug('[MouseHandler]', 'No saved objects found, creating new ones');
            this.createNewGameObjects();
        }
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    update(dt: number) {
        if (!this._canDrop) {
            this._currentCooldown -= dt;

            if (this._currentCooldown <= 0) {
                this._canDrop = true;
                this._currentCooldown = 0;
                logger.debug('[MouseHandler]', 'Cooldown finished, can drop again');
            }
        }
    }

    public saveAllObjects() {
        // Получаем только активные объекты из пула
        const activeNodes = this._poolManager?.getAllActiveNodes(POOL_KEYS.MERGED) || [];

        const dataToSave = activeNodes
        .map(node => node.getComponent(MergedObject))
        .filter(obj => obj !== null)
        .map(obj => obj.getData())
        .filter(data => data !== null);

        Bootstrap.getInstance().updateSavedData('MergedData', dataToSave);

        logger.debug('[MouseHandler]', `Saved ${ dataToSave.length } objects to localStorage`);

        // Выводим информацию о пуле для отладки
        const poolInfo = this._poolManager?.getPoolInfo(POOL_KEYS.MERGED);
        if (poolInfo) {
            logger.debug('[MouseHandler]', `Pool info: ${ poolInfo.active }/${ poolInfo.total } active objects`);
        }
    }

    //TODO: Для отладки
    public logPoolState() {
        this._poolManager?.logAllPools();
    }

    private onSwap() {
        if (!this._currentObjectData || !this._nextObjectData ||
            !this._currentObjectInstance || !this._nextObjectInstance) {
            logger.warn('[MouseHandler]', 'Cannot swap: missing objects');
            return;
        }

        const tempData = this._currentObjectData;
        const tempInstance = this._currentObjectInstance;

        this._currentObjectData = this._nextObjectData;
        this._currentObjectInstance = this._nextObjectInstance;

        this._nextObjectData = tempData;
        this._nextObjectInstance = tempInstance;

        this._currentObjectData.isCurrent = true;
        this._currentObjectData.isNext = false;

        this._nextObjectData.isCurrent = false;
        this._nextObjectData.isNext = true;

        if (this._currentObjectInstance) {
            this._currentObjectInstance.setIsCurrent();
            this._currentObjectInstance.enabledPhysics(false);

            const handPos = this.handHandler.node.getPosition();
            this._currentObjectInstance.node.setPosition(handPos.x, handPos.y, HANDLER_POSITION.Z);
            this._currentObjectData.position = { x: handPos.x, y: handPos.y };
        }

        if (this._nextObjectInstance) {
            this._nextObjectInstance.resetIsCurrentAndIsNext();
            this._nextObjectInstance.enabledPhysics(false);

            this._nextObjectInstance.node.setPosition(
                NEXT_OBJECT_POSITION.X,
                NEXT_OBJECT_POSITION.Y,
            );
            this._nextObjectData.position = {
                x: NEXT_OBJECT_POSITION.X,
                y: NEXT_OBJECT_POSITION.Y
            };
        }

        this.throttledSave();

        logger.debug('[MouseHandler]', 'Objects swapped successfully', {
            current: this._currentObjectData,
            next: this._nextObjectData
        });
    }

    private clear() {
        this.clearAllMergedObjects();
        this.createNewGameObjects();
    }

    private onSaved() {
        //this.debouncedSave();
        this.throttledSave();
    }

    private startCooldown() {
        this._canDrop = false;
        this._currentCooldown = this._cooldownTime;
        logger.debug('[MouseHandler]', `Cooldown started: ${ this._cooldownTime }s`);
    }

    private onTouchEnd(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;

        if (this._canDrop) {
            this.drop();
        } else {
            logger.debug('[MouseHandler]', `Cannot drop yet. Cooldown remaining: ${ this._currentCooldown.toFixed(COOLDOWN.DISPLAY_PRECISION) }s`);
        }
    }

    private onTouchMove(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;

        const clampPos = clamp(this._pos.x, HANDLER_POSITION.X_MIN, HANDLER_POSITION.X_MAX);

        this.handHandler.node.setPosition(clampPos, HANDLER_POSITION.Y, HANDLER_POSITION.Z);

        // Обновляем позицию текущего объекта если он есть
        if (this._currentObjectInstance) {
            this._currentObjectInstance.node.setPosition(clampPos, HANDLER_POSITION.Y, HANDLER_POSITION.Z);
        }
    }

    private onTouchStart(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;
    }

    // ============= МЕТОДЫ ДЛЯ СОХРАНЕНИЯ/ВОССТАНОВЛЕНИЯ =============

    private drop() {
        // Делаем текущий объект физическим
        if (this._currentObjectInstance) {
            this._currentObjectInstance.enabledPhysics(true);
            this._currentObjectInstance.resetIsCurrentAndIsNext();

            // Обновляем данные текущего объекта
            if (this._currentObjectData) {
                this._currentObjectData.isCurrent = false;
                this._currentObjectData.isNext = false;
            }
        }

        // Переносим следующий объект в текущий
        this._currentObjectData = this._nextObjectData;
        this._currentObjectInstance = this._nextObjectInstance;

        if (this._currentObjectData) {
            this._currentObjectData.isCurrent = true;
            this._currentObjectData.isNext = false;
        }

        if (this._currentObjectInstance) {
            this._currentObjectInstance.setIsCurrent();
        }

        // Создаем новый следующий объект
        const { data, instance } = this.createObjectData(false, true);
        this._nextObjectData = data;
        this._nextObjectInstance = instance;

        // Позиционируем текущий объект
        if (this._currentObjectInstance) {
            const handPos = this.handHandler.node.getPosition();
            this._currentObjectInstance.node.setPosition(handPos.x, handPos.y, HANDLER_POSITION.Z);
            this._currentObjectInstance.node.active = true;

            // Обновляем позицию в данных
            if (this._currentObjectData) {
                this._currentObjectData.position = { x: handPos.x, y: handPos.y };
            }
        }

        // Позиционируем следующий объект
        if (this._nextObjectInstance) {
            this._nextObjectInstance.node.setPosition(
                NEXT_OBJECT_POSITION.X,
                NEXT_OBJECT_POSITION.Y,
                NEXT_OBJECT_POSITION.Z
            );
            this._nextObjectInstance.node.active = true;

            // Обновляем позицию в данных
            if (this._nextObjectData) {
                this._nextObjectData.position = {
                    x: NEXT_OBJECT_POSITION.X,
                    y: NEXT_OBJECT_POSITION.Y,
                };
            }
        }

        this.startCooldown();
    }

    private createObjectData(isCurrent: boolean, isNext: boolean): { data: MergedData, instance: MergedObject } {
        const handPos = this.handHandler.node.getPosition();

        const node = this._poolManager.spawn(
            POOL_KEYS.MERGED,
            new Vec3(handPos.x, handPos.y, HANDLER_POSITION.Z)
        );

        if (!node) {
            logger.error('[MouseHandler]', 'Failed to spawn merged object');
            return null;
        }

        const mergedObj = node.getComponent(MergedObject);
        if (!mergedObj) {
            logger.error('[MouseHandler]', 'MergedObject component not found');
            return null;
        }

        const rndColor = getRandomEnumKey(MergedColor);
        const data = MergedData.fromVec3(
            node.uuid,
            isCurrent,
            isNext,
            DEFAULT_LEVEL,
            MergedColor[rndColor],
            new Vec3(handPos.x, handPos.y, HANDLER_POSITION.Z)
        );

        logger.debug('[MOUSE HANDLER]', `${ rndColor }:${ MergedColor[rndColor] }`);

        mergedObj.setData(data);
        mergedObj.enabledPhysics(false);

        return { data, instance: mergedObj };
    }

    private clearAllMergedObjects() {
        // Деспавним все объекты через пул
        this._poolManager?.despawnAll(POOL_KEYS.MERGED);

        // Очищаем кэш
        this._currentObjectInstance = null;
        this._nextObjectInstance = null;
        this._currentObjectData = null;
        this._nextObjectData = null;

        logger.debug('[MouseHandler]', 'Cleared all merged objects from scene');
    }

    private createNewGameObjects() {
        const current = this.createObjectData(true, false);
        this._currentObjectData = current.data;
        this._currentObjectInstance = current.instance;

        const next = this.createObjectData(false, true);
        this._nextObjectData = next.data;
        this._nextObjectInstance = next.instance;

        if (this._nextObjectInstance) {
            this._nextObjectInstance.node.setPosition(
                NEXT_OBJECT_POSITION.X,
                NEXT_OBJECT_POSITION.Y,
                NEXT_OBJECT_POSITION.Z
            );

            if (this._nextObjectData) {
                this._nextObjectData.position = {
                    x: NEXT_OBJECT_POSITION.X,
                    y: NEXT_OBJECT_POSITION.Y,
                };
            }
        }

        // Сохраняем начальное состояние
        this.saveAllObjects();
    }

    private restoreAllObjectsFromSave() {
        // Группируем объекты по типам
        const currentObjects = this._saved.filter(data => data.isCurrent);
        const nextObjects = this._saved.filter(data => data.isNext);
        const otherObjects = this._saved.filter(data => !data.isCurrent && !data.isNext);

        logger.debug('[MouseHandler]', `Restoring: current=${ currentObjects.length }, next=${ nextObjects.length }, others=${ otherObjects.length }`);

        // Восстанавливаем текущий объект
        if (currentObjects.length > 0) {
            this._currentObjectData = currentObjects[0];
            this._currentObjectInstance = this.createObjectFromData(this._currentObjectData);

            if (this._currentObjectInstance) {
                this._currentObjectInstance.enabledPhysics(false);

                // Устанавливаем позицию handHandler
                this.handHandler.node.setPosition(
                    this._currentObjectData.position.x,
                    this._currentObjectData.position.y,
                );

                logger.debug('[MouseHandler]', `Restored current object: color=${ this._currentObjectData.color }, pos=(${ this._currentObjectData.position.x }, ${ this._currentObjectData.position.y })`);
            }
        } else {
            logger.warn('[MouseHandler]', 'No current object found in save');
            const current = this.createObjectData(true, false);
            this._currentObjectData = current.data;
            this._currentObjectInstance = current.instance;
        }

        // Восстанавливаем следующий объект
        if (nextObjects.length > 0) {
            this._nextObjectData = nextObjects[0];
            this._nextObjectInstance = this.createObjectFromData(this._nextObjectData);

            if (this._nextObjectInstance) {
                this._nextObjectInstance.enabledPhysics(false);
                this._nextObjectInstance.node.setPosition(
                    NEXT_OBJECT_POSITION.X,
                    NEXT_OBJECT_POSITION.Y,
                    NEXT_OBJECT_POSITION.Z
                );

                logger.debug('[MouseHandler]', `Restored next object: color=${ this._nextObjectData.color }, level=${ this._nextObjectData.level }`);
            }
        } else {
            logger.warn('[MouseHandler]', 'No next object found in save');
            const next = this.createObjectData(false, true);
            this._nextObjectData = next.data;
            this._nextObjectInstance = next.instance;

            if (this._nextObjectInstance) {
                this._nextObjectInstance.node.setPosition(
                    NEXT_OBJECT_POSITION.X,
                    NEXT_OBJECT_POSITION.Y,
                    NEXT_OBJECT_POSITION.Z
                );
            }
        }

        // Восстанавливаем все остальные объекты (уже упавшие)
        otherObjects.forEach((data, index) => {
            const obj = this.createObjectFromData(data);
            if (obj) {
                obj.enabledPhysics(true);
                obj.resetIsCurrentAndIsNext();

                logger.debug('[MouseHandler]', `Restored object #${ index }: color=${ data.color }, pos=(${ data.position.x.toFixed(0) }, ${ data.position.y.toFixed(0) })`);
            }
        });

        logger.debug('[MouseHandler]', `Restoration complete. Total objects on scene: ${ this.getActiveObjectsCount() }`);
    }

    private createObjectFromData(data: MergedData): MergedObject | null {
        // Создаем Vec3 из position
        const position = new Vec3(data.position.x, data.position.y, HANDLER_POSITION.Z);
        const node = this._poolManager?.spawn(POOL_KEYS.MERGED, position);

        if (!node) {
            logger.error('[MouseHandler]', `Failed to spawn object at (${ data.position.x }, ${ data.position.y })`);
            return null;
        }

        const mergedObj = node.getComponent(MergedObject);
        if (mergedObj) {
            // Устанавливаем данные
            mergedObj.setData(data);

            return mergedObj;
        } else {
            logger.error('[MouseHandler]', 'MergedObject component not found on spawned node');
            this._poolManager?.despawn(POOL_KEYS.MERGED, node);
            return null;
        }
    }

    private getActiveObjectsCount(): number {
        return this._poolManager?.getAllActiveNodes(POOL_KEYS.MERGED)?.length || 0;
    }
}