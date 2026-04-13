import logger from "db://assets/core/utils/console";
import { Camera, Canvas, EventTouch, UITransform, Vec2, Vec3 } from 'cc';


export const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
};

export const clamp = (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
};

export const convertTouchToWorldPos = (camera: Camera, event: EventTouch): Vec3 => {
    if (!camera) {
        logger.error('[MouseTracker]', 'Camera not found');
        return new Vec3(0, 0, 0);
    }

    const touchLocation = event.getLocation();
    const screenPos = new Vec3(touchLocation.x, touchLocation.y, 0);
    const worldPos = new Vec3();
    camera.screenToWorld(screenPos, worldPos);

    return worldPos;
};

export const convertWorldToCanvasPos = (canvas: Canvas, worldPos: Vec3): Vec2 => {
    if (!canvas) {
        logger.error('[MouseTracker]', 'Canvas not found');
        return new Vec2(0, 0);
    }

    const uiTransform = canvas.getComponent(UITransform);
    if (!uiTransform) {
        logger.error('[MouseTracker]', 'UITransform not found on canvas');
        return new Vec2(0, 0);
    }

    const localPos = new Vec3();
    uiTransform.convertToNodeSpaceAR(worldPos, localPos);

    return new Vec2(localPos.x, localPos.y);
};

export const getRandomEnumKey = <T extends Record<string, string>>(enumObj: T): keyof T => {
    const keys = Object.keys(enumObj) as (keyof T)[];
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
};
