/**
 * Реклама
 * https://yandex.com/dev/games/doc/en/sdk/sdk-adv
 */
import Module from "db://assets/core/api/yandex-game/core/module";
import logger from "db://assets/core/utils/console";

class Adv extends Module {
    /**
     * Показ полноэкранной рекламы при загрузке
     */
    showFullscreenAd() {
        this.safeCall(() => {
            if (!this._ysdk.adv) {
                logger.error("Adv is missing");
                throw new Error('Adv is missing');
            }
            
            this._ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => logger.info('ADV: полноэкранная реклама открыта'),
                    onClose: (wasShown: boolean) => {
                        logger.info(`ADV: реклама закрыта, была показана: ${ wasShown }`);
                    },
                    onError: (error: Error) => logger.error('Initialization: ошибка показа рекламы', error)
                }
            });
        }, 'showFullscreenAd');
    }
}

export default Adv;