import { _decorator, director, sys } from 'cc';
import { DEV } from 'cc/env';
import logger from 'db://assets/core/utils/console';
import { SingletonComponent } from "db://assets/core/utils/SingletonComponent";
import { yandexSdk } from "db://assets/core/api/yandex-game";
import { SavedData } from "db://assets/core/api/yandex-game/feature/player/player";

const { ccclass, property } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends SingletonComponent<Bootstrap> {
    protected isPersistent: boolean = true;

    async start() {
        if (DEV) {
            logger.info('Bootstrap: DEV режим, пропускаем инициализацию SDK');
            director.loadScene('Game');
            return;
        }

        await yandexSdk.init();
        await yandexSdk.player.init();
        await yandexSdk.player.setData({
            Score: { score: 1000, maxScore: 2000 },
            MergedData: sys.localStorage.getItem('ObjectMap')
        });

        const playerData = await yandexSdk.player.getData() as SavedData;
        const localStorageData = sys.localStorage.getItem('ObjectMap');
        logger.warn('YG DATA', playerData.MergedData);
        logger.warn('YG DATA', playerData.Score);
        logger.warn('LS DATA', localStorageData);
        director.loadScene('Game');
    }
}