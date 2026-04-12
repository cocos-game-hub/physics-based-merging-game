import { _decorator, Camera, Canvas, Component, EventTouch, Input, input, UITransform, Vec2, Vec3 } from 'cc';
import logger from 'db://assets/core/utils/console';
import { container } from "db://assets/core/di/Container";
import { SERVICE_KEYS } from "db://assets/core/di/types";
import { PoolManager } from "db://assets/core/pool/PoolManager";
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";
import { MergedData } from "db://assets/modules/merged/data/MergedData";

const { ccclass, property } = _decorator;

@ccclass('MouseTracker')
export class MouseTracker extends Component {
    @property(Canvas) declare canvas: Canvas | null;
    @property(Camera) declare gameCamera: Camera | null;
    private _pos: Vec2 = new Vec2(0, 0);

    // Cooldown timer
    private _canDrop = true;
    private _cooldownTime: number = 0.45;
    private _currentCooldown: number = 0;

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);

        if (!this.gameCamera) {
            this.gameCamera = this.canvas?.node.scene.getComponentInChildren(Camera);
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

    private convertTouchToWorldPos(event: EventTouch): Vec3 {
        if (!this.gameCamera) {
            logger.error('[MouseTracker]', 'Camera not found');
            return new Vec3(0, 0, 0);
        }

        const touchLocation = event.getLocation();
        const screenPos = new Vec3(touchLocation.x, touchLocation.y, 0);
        const worldPos = new Vec3();
        this.gameCamera.screenToWorld(screenPos, worldPos);

        return worldPos;
    }

    private convertWorldToCanvasPos(worldPos: Vec3): Vec2 {
        if (!this.canvas) {
            logger.error('[MouseTracker]', 'Canvas not found');
            return new Vec2(0, 0);
        }

        const uiTransform = this.canvas.getComponent(UITransform);
        if (!uiTransform) {
            logger.error('[MouseTracker]', 'UITransform not found on canvas');
            return new Vec2(0, 0);
        }

        const localPos = new Vec3();
        uiTransform.convertToNodeSpaceAR(worldPos, localPos);

        return new Vec2(localPos.x, localPos.y);
    }

    private onTouchEnd(event: EventTouch) {
        const worldPos = this.convertTouchToWorldPos(event);
        this._pos = this.convertWorldToCanvasPos(worldPos);

        // Проверяем кулдаун
        if (this._canDrop) {
            this.drop();
        } else {
            logger.debug('[MouseTracker]', `Cannot drop yet. Cooldown remaining: ${ this._currentCooldown.toFixed(1) }s`);
        }
    }

    private onTouchMove(event: EventTouch) {
        const worldPos = this.convertTouchToWorldPos(event);
        const canvasPos = this.convertWorldToCanvasPos(worldPos);
        // Можно обновлять позицию для предпросмотра
        this._pos = canvasPos;
    }

    private onTouchStart(event: EventTouch) {
        const worldPos = this.convertTouchToWorldPos(event);
        const canvasPos = this.convertWorldToCanvasPos(worldPos);
        this._pos = canvasPos;
    }

    private drop() {
        const poolManager = container.get<PoolManager>(SERVICE_KEYS.POOL_MANAGER);

        const node = poolManager.spawn('merged', new Vec3(this._pos.x, this._pos.y, 0));

        if (!node) {
            logger.error('[MouseTracker]', 'Failed to spawn merged object');
            return;
        }

        const mergedObj = node.getComponent(MergedObject);
        if (mergedObj) {
            const data = MergedData.fromVec3(node.uuid, 1, new Vec3(this._pos.x, this._pos.y, 0));
            mergedObj.setData(data);
        }

        this.startCooldown();

        logger.debug('[MouseTracker]', 'Object dropped at', { x: this._pos.x, y: this._pos.y });
    }
}