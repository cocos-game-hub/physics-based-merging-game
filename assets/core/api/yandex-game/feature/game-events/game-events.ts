/**
 * Загрузка игры и разметка геймплея
 * https://yandex.com/dev/games/doc/en/sdk/sdk-game-events
 */
import Module from "db://assets/core/api/yandex-game/core/module";
import logger from "db://assets/core/utils/console";

class GameEvents extends Module {
    /**
     * Сообщаем платформе, что игра загрузилась и можно начинать играть.
     */
    gameReady() {
        try {
            if (this._ysdk.features.LoadingAPI) {
                this._ysdk.features.LoadingAPI.ready();
                logger.info('GameEvents: gameReady вызван');
            } else {
                logger.warn('GameEvents: LoadingAPI недоступен');
            }
        } catch (error) {
            logger.error('GameEvents: ошибка в gameReady', error);
        }
    }

    /**
     * Сообщаем о старте геймплея.
     */
    gameStart() {
        try {
            if (this._ysdk.features.GameplayAPI) {
                this._ysdk.features.GameplayAPI.start();
                logger.info('GameEvents: gameStart вызван');
            } else {
                logger.warn('GameEvents: GameplayAPI недоступен');
            }
        } catch (error) {
            logger.error('GameEvents: ошибка в gameStart', error);
        }
    }

    /**
     * Сообщаем об остановке геймплея:
     * игрок вышел в меню, прошел уровень или планируется показ рекламы.
     */
    gameStop() {
        try {
            if (this._ysdk.features.GameplayAPI) {
                this._ysdk.features.GameplayAPI.stop();
                logger.info('GameEvents: gameStop вызван');
            } else {
                logger.warn('GameEvents: GameplayAPI недоступен');
            }
        } catch (error) {
            logger.error('GameEvents: ошибка в gameStop', error);
        }
    }
}

export default GameEvents;