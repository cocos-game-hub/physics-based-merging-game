import { EventTarget } from 'cc';

type Callback<T = any> = (data: T) => void

class EventBus {
    private static _instance: EventBus = null!;
    private eventTarget: EventTarget = new EventTarget();

    private constructor() {}

    public static getInstance(): EventBus {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }

    public on(eventName: string, callback: Callback, target?: any) {
        this.eventTarget.on(eventName, callback, target);
    }

    public once(eventName: string, callback: Callback, target?: any) {
        this.eventTarget.once(eventName, callback, target);
    }

    public off(eventName: string, callback?: Callback, target?: any) {
        this.eventTarget.off(eventName, callback, target);
    }

    public emit(eventName: string, ...args: any[]) {
        this.eventTarget.emit(eventName, ...args);
    }
}

export const eventBus = EventBus.getInstance();