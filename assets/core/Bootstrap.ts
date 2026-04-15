import { _decorator, director, sys } from 'cc';
import { DEV } from 'cc/env';
import logger from 'db://assets/core/utils/console';
import { SingletonComponent } from "db://assets/core/utils/SingletonComponent";
import { yandexSdk } from "db://assets/core/api/yandex-game";
import { SavedData } from "db://assets/core/api/yandex-game/feature/player/player";
import { MergedData } from "db://assets/modules/merged/data/MergedData";

const { ccclass, property } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends SingletonComponent<Bootstrap> {
    protected isPersistent: boolean = true;
    private _savedData: SavedData | null = null;

    async start() {
        if (DEV) {
            logger.info('Bootstrap: DEV режим, пропускаем инициализацию SDK');
            this._savedData = this.getSavedData();
            director.loadScene('Game');
            return;
        }

        await yandexSdk.init();
        await yandexSdk.player.init();

        this._savedData = await yandexSdk.player.getData() as SavedData;

        director.loadScene('Game');
    }

    public removeSavedData() {
        if (DEV) {
            const json = '{"Score":{"score":72.02014543154391,"maxScore":904.7645544283137},"MergedData":[{"uuid":"Node.831","isCurrent":true,"isNext":false,"level":1,"color":"#D64040","position":{"x":0,"y":440}},{"uuid":"Node.837","isCurrent":false,"isNext":true,"level":1,"color":"#8840D6","position":{"x":0,"y":440}}]}';
            this.setSavedData(JSON.parse(json) as SavedData);
            return;
        }

        const savedData: SavedData = {
            Score: { score: 0, maxScore: 0 },
            MergedData: new Array<MergedData>
        };
        this.setSavedData(savedData);
    }

    public getSavedData(): SavedData {
        if (DEV) {
            return JSON.parse(sys.localStorage.getItem('savedData')) as SavedData;
        }

        return this._savedData;
    }

    public setSavedData(_savedData: SavedData) {
        if (DEV) {
            sys.localStorage.setItem('savedData', JSON.stringify(_savedData));
            return;
        }

        this.scheduleOnce(async () => {
            await yandexSdk.player.setData({
                Score: _savedData.Score,
                MergedData: _savedData.MergedData,
            });
        });
    }
}