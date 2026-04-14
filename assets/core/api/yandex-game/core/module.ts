import { SDK } from 'ysdk';
import Initialization from "db://assets/core/api/yandex-game/core/initialization";
import logger from 'db://assets/core/utils/console';

class Module {
    protected _initialization: Initialization;
    protected _ysdk: SDK;

    constructor(installation: Initialization, ysdk: SDK) {
        this._initialization = installation;
        this._ysdk = ysdk;
    }

    /**
     * Вспомогательный метод для безопасного выполнения асинхронных операций
     */
    protected async safeAsyncCall<T>(fn: () => Promise<T>, methodName: string): Promise<T> {
        try {
            return await fn();
        } catch (err) {
            logger.error(`[Module Error] ${ methodName }:`, err);
            throw err;
        }
    }

    /**
     * Вспомогательный метод для безопасного выполнения синхронных операций
     */
    protected safeCall<T>(fn: () => T, methodName: string): T {
        try {
            return fn();
        } catch (err) {
            logger.error(`[Module Error] ${ methodName }:`, err);
            throw err;
        }
    }
}

export default Module;