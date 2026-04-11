import { Component, director } from 'cc';

export abstract class SingletonComponent<T extends Component> extends Component {
    private static _instances: Map<string, any> = new Map();

    protected isPersistent: boolean = false;

    public static getInstance<T extends SingletonComponent<T>>(this: new () => T): T {
        const className = this.name;
        if (!SingletonComponent._instances.has(className)) {
            const scene = director.getScene();
            const existing = scene?.getComponentInChildren(this as any);
            if (existing) {
                SingletonComponent._instances.set(className, existing);
            } else {
                console.warn(`[SingletonComponent]`, `Экземпляр ${ className } не найден.`);
                return null as any;
            }
        }
        return SingletonComponent._instances.get(className) as T;
    }

    protected onLoad(): void {
        const className = this.constructor.name;
        if (SingletonComponent._instances.has(className)) {
            this.node.destroy();
            return;
        }
        SingletonComponent._instances.set(className, this);

        if (this.isPersistent) {
            director.addPersistRootNode(this.node);
        }
    }

    protected onDestroy(): void {
        const className = this.constructor.name;
        if (SingletonComponent._instances.get(className) === this) {
            SingletonComponent._instances.delete(className);
        }
        if (this.isPersistent && this.node.isValid) {
            director.removePersistRootNode(this.node);
        }
    }
}