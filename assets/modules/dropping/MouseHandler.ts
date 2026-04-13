import { _decorator, Camera, Canvas, Component, EventTouch, Input, input, Sprite, sys, Vec2, Vec3 } from 'cc';
import logger from 'db://assets/core/utils/console';
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";
import { MergedColor, MergedData } from "db://assets/modules/merged/data/MergedData";
import { clamp, convertTouchToWorldPos, convertWorldToCanvasPos, getRandomEnumKey } from "db://assets/core/utils";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { container } from "db://assets/core/di/Container";
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS } from "db://assets/core/event-bus/GameEvents";

const { ccclass, property } = _decorator;

@ccclass('MouseTracker')
export class MouseTracker extends Component {
    @property(Sprite) declare handHandler: Sprite | null;
    @property(Canvas) declare canvas: Canvas | null;
    @property(Camera) declare gameCamera: Camera | null;
    private _pos: Vec2 = new Vec2(0, 0);

    // Cooldown timer
    private _canDrop = true;
    private _cooldownTime: number = 0.5;
    private _currentCooldown: number = 0;
    private _poolManager: PoolManager | null;
    private _currentMergedObject: MergedObject | null;
    private _nextMergedObject: MergedObject | null;
    private _saved: MergedData[] | null = null;

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        eventBus.on(GAME_EVENTS.MERGE.COLLISION, this.onMergeCollision, this);
    }

    start() {
        this._saved = JSON.parse(sys.localStorage.getItem('ObjectMap')) as MergedData[];

        this._poolManager = container.get<PoolManager>(SERVICE_KEYS.POOL_MANAGER);

        if (!this.gameCamera) {
            this.gameCamera = this.canvas?.node.scene.getComponentInChildren(Camera);
        }

        // Очищаем сцену перед восстановлением
        this.clearAllMergedObjects();

        // Восстанавливаем ВСЕ объекты из сохранения
        if (this._saved && this._saved.length > 0) {
            logger.debug('[MouseTracker]', `Found ${ this._saved.length } saved objects`);
            this.restoreAllObjectsFromSave();
        } else {
            logger.debug('[MouseTracker]', 'No saved objects found, creating new ones');
            this.createNewGameObjects();
        }

        this.handHandler.node.setPosition(clamp(this._pos.x, -320, 320), 440, 0);

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
                logger.debug('[MouseTracker]', 'Cooldown finished, can drop again');
            }
        }
    }

    public saveAllObjects() {
        // Получаем только активные объекты из пула
        const activeNodes = this._poolManager?.getAllActiveNodes('merged') || [];

        const dataToSave = activeNodes
        .map(node => node.getComponent(MergedObject))
        .filter(obj => obj !== null)
        .map(obj => obj.getData())
        .filter(data => data !== null);

        sys.localStorage.setItem('ObjectMap', JSON.stringify(dataToSave));
        logger.debug('[MouseTracker]', `Saved ${ dataToSave.length } objects to localStorage`);

        // Выводим информацию о пуле для отладки
        const poolInfo = this._poolManager?.getPoolInfo('merged');
        if (poolInfo) {
            logger.debug('[MouseTracker]', `Pool info: ${ poolInfo.active }/${ poolInfo.total } active objects`);
        }
    }

    //TODO: Для отладки
    public logPoolState() {
        this._poolManager?.logAllPools();
    }

    private onMergeCollision() {
        this.saveAllObjects();
    }

    private startCooldown() {
        this._canDrop = false;
        this._currentCooldown = this._cooldownTime;
        logger.debug('[MouseTracker]', `Cooldown started: ${ this._cooldownTime }s`);
    }

    private onTouchEnd(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;

        if (this._canDrop) {
            this.drop();
        } else {
            logger.debug('[MouseTracker]', `Cannot drop yet. Cooldown remaining: ${ this._currentCooldown.toFixed(1) }s`);
        }
    }

    private onTouchMove(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;

        const clampPos = clamp(this._pos.x, -320, 320);

        this.handHandler.node.setPosition(clampPos, 440, 0);

        if (this._currentMergedObject) {
            this._currentMergedObject.node.setPosition(clampPos, 440, 0);
        }
    }

    private onTouchStart(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;
    }

    // ============= МЕТОДЫ ДЛЯ СОХРАНЕНИЯ/ВОССТАНОВЛЕНИЯ =============

    private drop() {
        if (this._currentMergedObject) {
            this._currentMergedObject.enabledPhysics(true);
            this._currentMergedObject.resetIsCurrentAndIsNext();
        }

        this._currentMergedObject = this._nextMergedObject;
        this._currentMergedObject.setIsCurrent();

        this._nextMergedObject = this.spawnMergedObject(false, true);

        if (this._currentMergedObject) {
            const handPos = this.handHandler.node.getPosition();
            this._currentMergedObject.node.setPosition(handPos.x, handPos.y, 0);
            this._currentMergedObject.node.active = true;
        }

        if (this._nextMergedObject) {
            this._nextMergedObject.node.setPosition(265, 570, 0);
            this._nextMergedObject.node.active = true;
        }

        this.startCooldown();

        // Сохраняем состояние после дропа
        this.saveAllObjects();
    }

    private spawnMergedObject(isCurrent: boolean, isNext: boolean): MergedObject {
        const handPos = this.handHandler.node.getPosition();

        const node = this._poolManager.spawn('merged', new Vec3(handPos.x, handPos.y, 0));

        if (!node) {
            logger.error('[MouseTracker]', 'Failed to spawn merged object');
            return;
        }

        const mergedObj = node.getComponent(MergedObject);
        if (mergedObj) {
            const rndColor = getRandomEnumKey(MergedColor);
            const data = MergedData.fromVec3(
                node.uuid,
                isCurrent,
                isNext,
                1,
                MergedColor[rndColor],
                new Vec3(handPos.x, handPos.y, 0)
            );

            logger.debug('[MOUSE HANDLER]', `${ rndColor }:${ MergedColor[rndColor] }`);

            mergedObj.setData(data);
            mergedObj.enabledPhysics(false);
        }

        return mergedObj;
    }

    private clearAllMergedObjects() {
        // Деспавним все объекты через пул
        this._poolManager?.despawnAll('merged');

        logger.debug('[MouseTracker]', 'Cleared all merged objects from scene');
    }

    private createNewGameObjects() {
        this._currentMergedObject = this.spawnMergedObject(true, false);
        this._nextMergedObject = this.spawnMergedObject(false, true);

        if (this._nextMergedObject) {
            this._nextMergedObject.node.setPosition(265, 570, 0);
        }

        // Сохраняем начальное состояние
        this.saveAllObjects();
    }

    private restoreAllObjectsFromSave() {
        // Группируем объекты по типам
        const currentObjects = this._saved.filter(data => data.isCurrent);
        const nextObjects = this._saved.filter(data => data.isNext);
        const otherObjects = this._saved.filter(data => !data.isCurrent && !data.isNext);

        logger.debug('[MouseTracker]', `Restoring: current=${ currentObjects.length }, next=${ nextObjects.length }, others=${ otherObjects.length }`);

        // Восстанавливаем текущий объект
        if (currentObjects.length > 0) {
            const currentData = currentObjects[0];
            this._currentMergedObject = this.createObjectFromData(currentData);

            if (this._currentMergedObject) {
                this._currentMergedObject.enabledPhysics(false);

                // Устанавливаем позицию handHandler
                this.handHandler.node.setPosition(currentData.position.x, currentData.position.y, 0);

                logger.debug('[MouseTracker]', `Restored current object: color=${ currentData.color }, pos=(${ currentData.position.x }, ${ currentData.position.y })`);
            }
        } else {
            logger.warn('[MouseTracker]', 'No current object found in save');
            this._currentMergedObject = this.spawnMergedObject(true, false);
        }

        // Восстанавливаем следующий объект
        if (nextObjects.length > 0) {
            const nextData = nextObjects[0];
            this._nextMergedObject = this.createObjectFromData(nextData);

            if (this._nextMergedObject) {
                this._nextMergedObject.enabledPhysics(false);
                this._nextMergedObject.node.setPosition(265, 570, 0);

                logger.debug('[MouseTracker]', `Restored next object: color=${ nextData.color }, level=${ nextData.level }`);
            }
        } else {
            logger.warn('[MouseTracker]', 'No next object found in save');
            this._nextMergedObject = this.spawnMergedObject(false, true);
            if (this._nextMergedObject) {
                this._nextMergedObject.node.setPosition(265, 570, 0);
            }
        }

        // Восстанавливаем все остальные объекты (уже упавшие)
        otherObjects.forEach((data, index) => {
            const obj = this.createObjectFromData(data);
            if (obj) {
                obj.enabledPhysics(true);
                obj.resetIsCurrentAndIsNext();

                logger.debug('[MouseTracker]', `Restored object #${ index }: color=${ data.color }, pos=(${ data.position.x.toFixed(0) }, ${ data.position.y.toFixed(0) })`);
            }
        });

        logger.debug('[MouseTracker]', `Restoration complete. Total objects on scene: ${ this.getActiveObjectsCount() }`);
    }

    private createObjectFromData(data: MergedData): MergedObject | null {
        // Создаем Vec3 из position
        const position = new Vec3(data.position.x, data.position.y, 0);
        const node = this._poolManager?.spawn('merged', position);

        if (!node) {
            logger.error('[MouseTracker]', `Failed to spawn object at (${ data.position.x }, ${ data.position.y })`);
            return null;
        }

        const mergedObj = node.getComponent(MergedObject);
        if (mergedObj) {
            // Устанавливаем данные
            mergedObj.setData(data);

            return mergedObj;
        } else {
            logger.error('[MouseTracker]', 'MergedObject component not found on spawned node');
            this._poolManager?.despawn('merged', node);
            return null;
        }
    }

    private getActiveObjectsCount(): number {
        return this._poolManager?.getAllActiveNodes('merged')?.length || 0;
    }
}