import { _decorator, Camera, Canvas, Component, EventTouch, Input, input, Sprite, Vec2, Vec3 } from 'cc';
import logger from 'db://assets/core/utils/console';
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";
import { MergedColor, MergedData } from "db://assets/modules/merged/data/MergedData";
import { clamp, convertTouchToWorldPos, convertWorldToCanvasPos, getRandomEnumKey } from "db://assets/core/utils";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { container } from "db://assets/core/di/Container";

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
    private poolManager: PoolManager | null;
    private currentMergedObject: MergedObject | null;
    private nextMergedObject: MergedObject | null;

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    start() {
        this.poolManager = container.get<PoolManager>(SERVICE_KEYS.POOL_MANAGER);

        if (!this.gameCamera) {
            this.gameCamera = this.canvas?.node.scene.getComponentInChildren(Camera);
        }

        this.currentMergedObject = this.spawnMergedObject();
        this.nextMergedObject = this.spawnMergedObject();

        if (this.nextMergedObject) {
            this.nextMergedObject.node.setPosition(265, 570, 0);
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
                logger.debug('[MouseTracker]', 'Cooldown finished, can drop again');
            }
        }
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

        if (this.currentMergedObject) {
            this.currentMergedObject.node.setPosition(clampPos, 440, 0);
        }
    }

    private onTouchStart(event: EventTouch) {
        const worldPos = convertTouchToWorldPos(this.gameCamera, event);
        const canvasPos = convertWorldToCanvasPos(this.canvas, worldPos);
        this._pos = canvasPos;
    }

    private drop() {
        if (this.currentMergedObject) {
            this.currentMergedObject.enabledPhysics(true);
        }

        this.currentMergedObject = this.nextMergedObject;

        this.nextMergedObject = this.spawnMergedObject();

        if (this.currentMergedObject) {
            const handPos = this.handHandler.node.getPosition();
            this.currentMergedObject.node.setPosition(handPos.x, handPos.y, 0);
            this.currentMergedObject.node.active = true;
        }

        if (this.nextMergedObject) {
            this.nextMergedObject.node.setPosition(265, 570, 0);
            this.nextMergedObject.node.active = true;
        }

        this.startCooldown();
    }

    private spawnMergedObject(): MergedObject {
        const handPos = this.handHandler.node.getPosition();

        const node = this.poolManager.spawn('merged', new Vec3(handPos.x, handPos.y, 0));

        if (!node) {
            logger.error('[MouseTracker]', 'Failed to spawn merged object');
            return;
        }

        const mergedObj = node.getComponent(MergedObject);
        if (mergedObj) {
            const rndColor = getRandomEnumKey(MergedColor);
            const data = MergedData.fromVec3(node.uuid, 1, MergedColor[rndColor], new Vec3(handPos.x, handPos.y, 0));

            logger.debug('[MOUSE HANDLER]', `${ rndColor as MergedColor }:${ MergedColor[rndColor] }`);

            mergedObj.setData(data);
            mergedObj.enabledPhysics(false);
        }

        return mergedObj;
    }
}