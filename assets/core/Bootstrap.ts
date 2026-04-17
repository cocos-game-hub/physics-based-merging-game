import { _decorator, director, sys } from 'cc';
//import { DEV } from 'cc/env';
import logger from 'db://assets/core/utils/console';
import { SingletonComponent } from "db://assets/core/utils/SingletonComponent";
import { yandexSdk } from "db://assets/core/api/yandex-game";
import { SavedData, SavedDataKey, SavedDataTypes } from "db://assets/core/api/yandex-game/feature/player/player";
import { MergedData } from "db://assets/modules/merged/data/MergedData";

const { ccclass, property } = _decorator;
const DEV = true;

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
            await yandexSdk.init();
            logger.info('Bootstrap: DEV режим, пропускаем инициализацию SDK');
            const savedData = this.getSavedData();
            if (savedData) {
                this._savedData = savedData;
            } else {
                this._savedData = JSON.parse(this._defaultJson) as SavedData;
                await this.setSavedData(this._savedData);
            }
            logger.warn('[Bootstrap] Saved data LS', this._savedData);
            director.loadScene('Game');
            return;
        }

        /*await yandexSdk.init();
        await yandexSdk.player.init();

        this._savedData = await yandexSdk.player.getData() as SavedData;

        logger.warn('Saved data YG', this._savedData);
        logger.warn('MaxScore', this._savedData.MaxScore);
        logger.warn('CurScore', this._savedData.CurScore);

        director.loadScene('Game');*/
    }

    public async removeSavedData() {
        if (DEV) {
            const json = `{"MaxScore":${ this.savedData.MaxScore | 0 }, "CurScore":0,"MergedData":[{"uuid":"Node.831","isCurrent":true,"isNext":false,"level":1,"color":"#D64040","position":{"x":0,"y":440}},{"uuid":"Node.837","isCurrent":false,"isNext":true,"level":1,"color":"#8840D6","position":{"x":0,"y":440}}]}`;
            await this.setSavedData(JSON.parse(json) as SavedData);

            return;
        }

        const savedData: SavedData = {
            MaxScore: this.savedData.MaxScore,
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
            const savedData = this.savedData;
            savedData[key] = data;
            await this.setSavedData(savedData);

            return;
        }

        await yandexSdk.player.updateData(key, data);
    }

    /**
     * Массовое обновление данных по нескольким ключам
     * @param data - Объект с обновляемыми данными (частичный SavedData)
     * @example
     * await bootstrap.updateMultipleData({
     *     MaxScore: 100,
     *     CurScore: 50
     * });
     */
    public async updateMultipleData(data: Partial<SavedData>) {
        if (DEV) {
            const savedData = this.savedData;
            Object.assign(savedData, data);
            await this.setSavedData(savedData);

            return;
        }

        await yandexSdk.player.updateData(data);
        // Обновляем локальный кеш
        if (this._savedData) {
            Object.assign(this._savedData, data);
        }
    }

    /**
     * Обновление данных с немедленной отправкой на сервер
     * @param data - Объект с обновляемыми данными
     * @param flush - Немедленная отправка на сервер (по умолчанию true)
     */
    public async updateMultipleDataFlush(data: Partial<SavedData>, flush: boolean = true) {
        if (DEV) {
            const savedData = this.savedData;
            Object.assign(savedData, data);
            await this.setSavedData(savedData);

            return;
        }

        await yandexSdk.player.updateData(data);
        // Обновляем локальный кеш
        if (this._savedData) {
            Object.assign(this._savedData, data);
        }
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

        // Обновляем локальный кеш
        this._savedData = _savedData;
    }
}