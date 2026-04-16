import { _decorator, director, sys } from 'cc';
import { DEV } from 'cc/env';
import logger from 'db://assets/core/utils/console';
import { SingletonComponent } from "db://assets/core/utils/SingletonComponent";
import { yandexSdk } from "db://assets/core/api/yandex-game";
import { SavedData, SavedDataKey, SavedDataTypes } from "db://assets/core/api/yandex-game/feature/player/player";
import { MergedData } from "db://assets/modules/merged/data/MergedData";

const { ccclass, property } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends SingletonComponent<Bootstrap> {
    protected isPersistent: boolean = true;
    private _defaultJson = `{"MaxScore":0, "CurScore":0,"MergedData":[{"uuid":"Node.831","isCurrent":true,"isNext":false,"level":1,"color":"#D64040","position":{"x":0,"y":440}},{"uuid":"Node.837","isCurrent":false,"isNext":true,"level":1,"color":"#8840D6","position":{"x":0,"y":440}}]}`;

    private _savedData: SavedData | null = null;

    get savedData(): SavedData | null {
        return this._savedData;
    }

    async start() {
        if (DEV) {
            logger.info('Bootstrap: DEV режим, пропускаем инициализацию SDK');
            this._savedData = this.getSavedData() as SavedData;
            if (!this._savedData) {
                await this.setSavedData(JSON.parse(this._defaultJson) as SavedData);
            }
            logger.warn('[Bootstrap] Saved data LS', this._savedData);
            director.loadScene('Game');
            return;
        }

        await yandexSdk.init();
        await yandexSdk.player.init();

        this._savedData = await yandexSdk.player.getData() as SavedData;

        logger.warn('Saved data YG', this._savedData);

        director.loadScene('Game');
    }

    public async removeSavedData() {
        if (DEV) {
            const json = `{"MaxScore":${ this.getSavedData().MaxScore | 0 }, "CurScore":0,"MergedData":[{"uuid":"Node.831","isCurrent":true,"isNext":false,"level":1,"color":"#D64040","position":{"x":0,"y":440}},{"uuid":"Node.837","isCurrent":false,"isNext":true,"level":1,"color":"#8840D6","position":{"x":0,"y":440}}]}`;
            await this.setSavedData(JSON.parse(json) as SavedData);

            return;
        }

        const savedData: SavedData = {
            MaxScore: this.getSavedData().MaxScore,
            CurScore: 0,
            MergedData: new Array<MergedData>
        };
        await this.setSavedData(savedData);
    }

    public getSavedData(): SavedData {
        if (DEV) {
            return JSON.parse(sys.localStorage.getItem('savedData')) as SavedData;
        }

        return this._savedData;
    }

    public async updateSavedData<K extends SavedDataKey>(key: K, data: SavedDataTypes[K]) {
        if (DEV) {
            const savedData = this.getSavedData();
            savedData[key] = data;
            await this.setSavedData(savedData);

            return;
        }

        await yandexSdk.player.updateData(key, data);
    }

    public async setSavedData(_savedData: SavedData) {
        if (DEV) {
            sys.localStorage.setItem('savedData', JSON.stringify(_savedData));

            return;
        }

        await yandexSdk.player.setData({
            MaxScore: _savedData.MaxScore,
            CurScore: _savedData.CurScore,
            MergedData: _savedData.MergedData,
        });
    }
}