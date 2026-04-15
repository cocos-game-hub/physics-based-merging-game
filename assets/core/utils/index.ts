import logger from "db://assets/core/utils/console";
import { _decorator, Camera, Canvas, Component, EventTouch, UITransform, Vec2, Vec3 } from 'cc';

const { ccclass } = _decorator;


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

/**
 * Генератор функции подавления дребезга (debounce) для Cocos Creator 3.8
 * @param fn Исходная функция
 * @param delay Задержка в секундах
 * @param component Экземпляр компонента (обычно this)
 */
export function createCocosDebounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    component: Component
): (...args: Parameters<T>) => void {
    let scheduledCallback: (() => void) | null = null;

    return (...args: Parameters<T>) => {
        if (scheduledCallback) {
            component.unschedule(scheduledCallback);
            scheduledCallback = null;
        }

        scheduledCallback = () => {
            fn(...args);
            scheduledCallback = null;
        };

        component.scheduleOnce(scheduledCallback, delay);
    };
}

export function createCocosThrottle<T extends (...args: any[]) => any>(
    fn: T,
    interval: number,
    component: Component
): (...args: Parameters<T>) => void {
    let lastCallTime = 0;
    let pendingArgs: Parameters<T> | null = null;
    let scheduledCallback: (() => void) | null = null;

    return (...args: Parameters<T>) => {
        const now = Date.now() / 1000; // в секундах
        pendingArgs = args;

        // Если прошло достаточно времени — выполняем сразу
        if (now - lastCallTime >= interval) {
            lastCallTime = now;
            fn(...args);
            pendingArgs = null;

            if (scheduledCallback) {
                component.unschedule(scheduledCallback);
                scheduledCallback = null;
            }
        }
        // Иначе планируем на конец интервала (если ещё не запланировано)
        else if (!scheduledCallback) {
            const timeToWait = interval - (now - lastCallTime);

            scheduledCallback = () => {
                if (pendingArgs) {
                    lastCallTime = Date.now() / 1000;
                    fn(...pendingArgs);
                    pendingArgs = null;
                }
                scheduledCallback = null;
            };

            component.scheduleOnce(scheduledCallback, timeToWait);
        }
    };
}