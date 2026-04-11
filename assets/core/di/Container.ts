export class Container {
    private services = new Map<Symbol, any>();

    set<T>(key: Symbol, instance: T) {
        if (this.services.has(key)) {
            console.warn(`Service ${ key } already registered`);
        }

        this.services.set(key, instance);
    }

    get<T>(key: Symbol): T {
        const service = this.services.get(key);

        if (!service) {
            throw new Error(`Service ${ key } not found`);
        }

        return service;
    }
}

export const container = new Container();