/**
 * Данные игрока
 * https://yandex.ru/dev/games/doc/ru/sdk/sdk-player
 */
import Module from "db://assets/core/api/yandex-game/core/module";
import type { Player as P } from 'ysdk';

const saveDefinitions = {
    ObjectMap: 'ObjectMap',
    Score: 'Score',
} as const;

type SaveDefinitions = typeof saveDefinitions;
type SaveKey = keyof SaveDefinitions;

export type Save<T> = {
    [K in SaveKey]: Array<T>;
}

class Player extends Module {
    private player: P | null = null;

    async init(): Promise<P> {
        return this.safeAsyncCall(async () => {
            this.player = await this._ysdk.getPlayer();
            return this.player;
        }, 'initPlayer');
    }

    async setData<K extends SaveKey>(data: Partial<Record<K, any>>, flush: boolean = false): Promise<void> {
        return this.safeAsyncCall(async () => {
            if (!this.player) {
                throw new Error('Player not initialized. Call init() first.');
            }
            await this.player.setData(data, flush);
        }, 'setData');
    }

    async getData<K extends SaveKey>(keys?: Array<K>): Promise<any> {
        return this.safeAsyncCall(async () => {
            if (!this.player) {
                throw new Error('Player not initialized. Call init() first.');
            }
            return await this.player.getData(keys);
        }, 'getData');
    }

    getPlayerInfo() {
        if (!this.player) return null;

        return this.safeCall(() => ({
            id: this.player.getUniqueID?.(),
            name: this.player.getName?.(),
            photo: this.player.getPhoto?.('large'),
            mode: this.player.getMode?.()
        }), 'getPlayerInfo');
    }

    isAuthorized(): boolean {
        return this.safeCall(() => {
            return this.player?.getMode?.() !== 'lite';
        }, 'isAuthorized') || false;
    }
}

export default Player;