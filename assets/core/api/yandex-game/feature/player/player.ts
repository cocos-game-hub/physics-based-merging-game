import Module from "db://assets/core/api/yandex-game/core/module";
import { MergedData } from "db://assets/modules/merged/data/MergedData";
import type { Player as P } from 'ysdk';

const savedDataDefinitions = {
    MergedData: 'MergedData',
    MaxScore: 'MaxScore',
    CurScore: 'CurScore',
} as const;

type SavedDataDefinitions = typeof savedDataDefinitions;
export type SavedDataKey = keyof SavedDataDefinitions;

export interface SavedDataTypes {
    MergedData: MergedData[];
    MaxScore: number;
    CurScore: number;
}

export type SavedData = {
    [K in SavedDataKey]: SavedDataTypes[K];
}

class Player extends Module {
    private player: P | null = null;

    async init(): Promise<P> {
        return this.safeAsyncCall(async () => {
            this.player = await this._ysdk.getPlayer();
            return this.player;
        }, 'initPlayer');
    }

    async setData(
        data: Partial<SavedData>,
        flush: boolean = false
    ): Promise<void> {
        return this.safeAsyncCall(async () => {
            if (!this.player) {
                throw new Error('Player not initialized. Call init() first.');
            }
            await this.player.setData(data as Record<string, any>, flush);
        }, 'setData');
    }

    async getData(): Promise<Partial<SavedData>>;
    async getData<K extends SavedDataKey>(keys: Array<K>): Promise<Pick<SavedData, K>>;
    async getData<K extends SavedDataKey>(keys?: Array<K>): Promise<any> {
        return this.safeAsyncCall(async () => {
            if (!this.player) {
                throw new Error('Player not initialized. Call init() first.');
            }
            return await this.player.getData(keys as string[]);
        }, 'getData');
    }

    /**
     * Частичное обновление данных по одному ключу
     * @param key - Ключ данных для обновления
     * @param value - Новое значение
     * @param flush - Немедленная отправка на сервер
     */
    async updateData<K extends SavedDataKey>(
        key: K,
        value: SavedDataTypes[K],
        flush: boolean = false
    ): Promise<void> {
        return this.safeAsyncCall(async () => {
            if (!this.player) {
                throw new Error('Player not initialized. Call init() first.');
            }
            await this.player.setData({ [key]: value } as any, flush);
        }, 'updateData');
    }

    getPlayerInfo() {
        if (!this.player) return null;

        return this.safeCall(() => ({
            id: this.player?.getUniqueID?.(),
            name: this.player?.getName?.(),
            photo: this.player?.getPhoto?.('large'),
            mode: this.player?.getMode?.()
        }), 'getPlayerInfo');
    }

    isAuthorized(): boolean {
        return this.safeCall(() => {
            return this.player?.getMode?.() !== 'lite';
        }, 'isAuthorized') || false;
    }
}

export default Player;