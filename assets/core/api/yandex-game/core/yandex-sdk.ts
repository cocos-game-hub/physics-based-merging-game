import { SDK } from 'ysdk';
import GameEvents from "db://assets/core/api/yandex-game/feature/game-events/game-events";
import Player from "db://assets/core/api/yandex-game/feature/player/player";
import Adv from "db://assets/core/api/yandex-game/feature/adv/adv";
import Initialization from "db://assets/core/api/yandex-game/core/initialization";
import logger from 'db://assets/core/utils/console';

const moduleDefinitions = {
    gameEvents: GameEvents,
    adv: Adv,
    player: Player
} as const;

type ModuleDefinitions = typeof moduleDefinitions;

type Modules = {
    [K in keyof ModuleDefinitions]: InstanceType<ModuleDefinitions[K]>;
};

class YandexSdk {
    private _ysdk!: SDK;
    private _initialization!: Initialization;
    private _modules!: Modules;

    /**
     * Получить все модули
     */
    get modules(): Modules {
        this.ensureInitialized();
        return this._modules;
    }

    private _isInitialized = false;

    /**
     * Статус инициализации
     */
    get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Получить модуль gameplayMarkup
     */
    get gameEvents(): GameEvents {
        this.ensureInitialized();
        return this._modules.gameEvents;
    }

    /**
     * Получить модуль adv
     */
    get adv(): Adv {
        this.ensureInitialized();
        return this._modules.adv;
    }

    /*
    * Получить модуль player
    * */
    get player(): Player {
        this.ensureInitialized();
        return this._modules.player;
    }

    /**
     * Получить оригинальный SDK (для продвинутого использования)
     */
    get sdk(): SDK {
        this.ensureInitialized();
        return this._ysdk;
    }

    async init() {
        if (this._isInitialized) {
            logger.warn('YandexSdk уже инициализирован');
            return;
        }

        try {
            logger.info('YandexSdk: начало инициализации');

            // Инициализация SDK
            this._initialization = new Initialization();
            const ysdk: SDK = await this._initialization.waitForYaGames();

            if (!ysdk) {
                throw new Error('Не удалось инициализировать Yandex SDK');
            }

            this._ysdk = ysdk;
            logger.info('YandexSdk: SDK получен');

            // Создание модулей
            //@ts-ignore
            this._modules = Object.entries(moduleDefinitions).reduce(
                (acc, [key, ModuleClass]) => {
                    logger.info(`YandexSdk: создание модуля ${ key }`);
                    acc[key as keyof Modules] = new ModuleClass(this._initialization, this._ysdk);
                    return acc;
                },
                {} as Modules
            );

            // Вызов init у модулей, если метод существует
            //@ts-ignore
            for (const [key, module] of Object.entries(this._modules)) {
                if (module && typeof (module as any).init === 'function') {
                    logger.info(`YandexSdk: вызов init() у модуля ${ key }`);
                    await (module as any).init();
                }
            }

            this._isInitialized = true;
            logger.info('YandexSdk: инициализация завершена');
        } catch (error) {
            logger.error('YandexSdk: ошибка инициализации', error);
            throw error;
        }
    }

    /**
     * Проверка инициализации
     */
    private ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error('YandexSdk не инициализирован. Вызовите init() сначала.');
        }
    }
}

export { YandexSdk };