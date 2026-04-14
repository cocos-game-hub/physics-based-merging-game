import type { SDK } from 'ysdk';
import logger from "db://assets/core/utils/console";

declare global {
    interface Window {
        YaGames?: {
            init: () => Promise<SDK>;
        };
    }
}

class Initialization {
    private ysdk: SDK | null = null;
    private initYgCount = 0;
    private readonly MAX_ATTEMPTS = 5;
    private readonly RETRY_DELAY = 1000;

    /**
     * Ожидание появления window.YaGames и инициализация SDK
     */
    async waitForYaGames(): Promise<SDK | null> {
        return new Promise((resolve) => {
            const check = async () => {
                if (typeof window.YaGames !== 'undefined' && window.YaGames) {
                    try {
                        const sdk = await window.YaGames.init();
                        this.ysdk = sdk;
                        logger.info('Initialization: Yandex SDK успешно инициализирован');
                        resolve(sdk);
                        return;
                    } catch (error) {
                        logger.error(`Initialization: ошибка инициализации SDK (попытка ${ this.initYgCount + 1 })`, error);
                    }
                }

                this.initYgCount++;
                if (this.initYgCount < this.MAX_ATTEMPTS) {
                    logger.info(`Initialization: YaGames не найден, попытка ${ this.initYgCount }/${ this.MAX_ATTEMPTS }`);
                    setTimeout(check, this.RETRY_DELAY);
                } else {
                    logger.error('Initialization: превышено максимальное количество попыток инициализации SDK');
                    resolve(null);
                }
            };

            check();
        });
    }

    getSDK(): SDK {
        if (!this.ysdk) {
            throw new Error('Yandex SDK is not initialized');
        }
        return this.ysdk;
    }
}

export default Initialization;