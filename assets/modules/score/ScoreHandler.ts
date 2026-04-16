import { _decorator, Component, Enum, RichText, Tween, tween } from 'cc';
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS, MergeExecuteEvent } from "db://assets/core/event-bus/GameEvents";
import { Bootstrap } from "db://assets/core/Bootstrap";

const { ccclass, property } = _decorator;

export enum ZeroPosition {
    LEFT = 0,   // 00000042
    RIGHT = 1   // 42000000
}

@ccclass('ScoreHandler')
export class ScoreHandler extends Component {
    @property(RichText) declare score: RichText;
    @property(RichText) declare maxScore: RichText;

    @property({ tooltip: 'Длительность анимации в секундах' })
    animationDuration: number = 0.3;

    @property({ tooltip: 'Количество цифр в отображении счёта' })
    digitCount: number = 8;

    @property({
        type: Enum(ZeroPosition),
        tooltip: 'Позиция серых нулей для ОСНОВНОГО счёта'
    })
    scoreZeroPosition: ZeroPosition = ZeroPosition.LEFT;

    @property({
        type: Enum(ZeroPosition),
        tooltip: 'Позиция серых нулей для МАКСИМАЛЬНОГО счёта'
    })
    maxScoreZeroPosition: ZeroPosition = ZeroPosition.LEFT;

    private _score: number = 0;
    private _displayScore: number = 0;
    private _maxScore: number = 0;
    private _displayMaxScore: number = 0;

    private _scoreTween: Tween<{ value: number }> | null = null;
    private _maxScoreTween: Tween<{ value: number }> | null = null;

    start() {
        eventBus.on(GAME_EVENTS.MERGE.EXECUTE, this.onMergeExecute, this);
        eventBus.on(GAME_EVENTS.GAMEPLAY.RESET, this.onReset, this);

        this._maxScore = Bootstrap.getInstance().getSavedData().MaxScore | 0;
        this._score = Bootstrap.getInstance().getSavedData().CurScore | 0;
        this.updateScoreDisplay(this._score);
        this.updateMaxScoreDisplay(this._maxScore);
    }

    public setScoreZeroPosition(position: ZeroPosition) {
        this.scoreZeroPosition = position;
        this.updateScoreDisplay(this._score);
    }

    public setMaxScoreZeroPosition(position: ZeroPosition) {
        this.maxScoreZeroPosition = position;
        this.updateMaxScoreDisplay(this._maxScore);
    }

    public toggleScoreZeroPosition() {
        this.scoreZeroPosition = this.scoreZeroPosition === ZeroPosition.LEFT
            ? ZeroPosition.RIGHT
            : ZeroPosition.LEFT;
        this.updateScoreDisplay(this._score);
    }

    public toggleMaxScoreZeroPosition() {
        this.maxScoreZeroPosition = this.maxScoreZeroPosition === ZeroPosition.LEFT
            ? ZeroPosition.RIGHT
            : ZeroPosition.LEFT;
        this.updateMaxScoreDisplay(this._maxScore);
    }

    // Для сброса счёта (например, новая игра)
    public resetScore() {
        this._score = 0;
        this._displayScore = 0;
        this.updateScoreDisplay(0);
    }

    public resetMaxScore() {
        this._maxScore = 0;
        this._displayMaxScore = 0;
        this.updateMaxScoreDisplay(0);
    }

    public resetAll() {
        this.resetScore();
        this.resetMaxScore();
    }

    onDestroy() {
        eventBus.off(GAME_EVENTS.MERGE.EXECUTE, this.onMergeExecute, this);
        if (this._scoreTween) {
            this._scoreTween.stop();
        }
        if (this._maxScoreTween) {
            this._maxScoreTween.stop();
        }
    }

    private onReset() {
        this._score = 0;
        this.updateScoreDisplay(this._score);
    }

    private updateData() {
        Bootstrap.getInstance().updateSavedData('MaxScore', this._maxScore);
    }

    private addScore() {
        const oldScore = this._score;
        const oldMaxScore = this._maxScore;

        if (this._score > this._maxScore) {
            this._maxScore = this._score;
            this.animateMaxScore(oldMaxScore, this._maxScore);
            this.updateData();
        }

        Bootstrap.getInstance().updateSavedData('CurScore', this._score);

        this.animateScore(oldScore, this._score);
    }

    private onMergeExecute(event: MergeExecuteEvent) {
        this._score += event.newData.level;
        this.addScore();
    }

    private animateScore(from: number, to: number) {
        if (this._scoreTween) {
            this._scoreTween.stop();
        }

        const obj = { value: from };
        this._scoreTween = tween(obj)
        .to(this.animationDuration, { value: to }, {
            onUpdate: () => {
                this._displayScore = Math.floor(obj.value);
                this.updateScoreDisplay(this._displayScore, to);
            },
            easing: 'sineOut'
        })
        .call(() => {
            this._displayScore = to;
            this.updateScoreDisplay(to);
            this._scoreTween = null;
        })
        .start();
    }

    private animateMaxScore(from: number, to: number) {
        if (this._maxScoreTween) {
            this._maxScoreTween.stop();
        }

        const obj = { value: from };
        this._maxScoreTween = tween(obj)
        .to(this.animationDuration, { value: to }, {
            onUpdate: () => {
                this._displayMaxScore = Math.floor(obj.value);
                this.updateMaxScoreDisplay(this._displayMaxScore, to);
            },
            easing: 'sineOut'
        })
        .call(() => {
            this._displayMaxScore = to;
            this.updateMaxScoreDisplay(to);
            this._maxScoreTween = null;
        })
        .start();
    }

    private updateScoreDisplay(value: number, targetValue?: number) {
        if (targetValue !== undefined) {
            this.score.string = this.formatNumberWithHighlight(value, targetValue, this.scoreZeroPosition);
        } else {
            this.score.string = this.formatNumberWithLeadingZeros(value, this.scoreZeroPosition);
        }
    }

    private updateMaxScoreDisplay(value: number, targetValue?: number) {
        if (targetValue !== undefined) {
            this.maxScore.string = this.formatNumberWithHighlight(value, targetValue, this.maxScoreZeroPosition);
        } else {
            this.maxScore.string = this.formatNumberWithLeadingZeros(value, this.maxScoreZeroPosition);
        }
    }

    private padNumber(num: number, length: number): string {
        let str = num.toString();
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }

    private formatNumberWithLeadingZeros(value: number, zeroPosition: ZeroPosition): string {
        const valueStr = value.toString();
        const zerosCount = this.digitCount - valueStr.length;

        let result = '';

        if (zeroPosition === ZeroPosition.LEFT) {
            // Нули слева: 00000042
            for (let i = 0; i < zerosCount; i++) {
                result += `<color=#949494>0</color>`;
            }
            result += `<color=#FFFFFF>${ valueStr }</color>`;
        } else {
            // Нули справа: 42000000
            result += `<color=#FFFFFF>${ valueStr }</color>`;
            for (let i = 0; i < zerosCount; i++) {
                result += `<color=#949494>0</color>`;
            }
        }

        return result;
    }

    private formatNumberWithHighlight(value: number, targetValue: number, zeroPosition: ZeroPosition): string {
        const valueStr = this.padNumber(value, this.digitCount);
        const targetStr = this.padNumber(targetValue, this.digitCount);

        if (zeroPosition === ZeroPosition.LEFT) {
            // Нули слева
            const valueWithoutZeros = value.toString();
            const targetWithoutZeros = targetValue.toString();
            const maxLength = Math.max(valueWithoutZeros.length, targetWithoutZeros.length);

            let result = '';

            // Добавляем ведущие нули (всегда серые)
            const zerosCount = this.digitCount - maxLength;
            for (let i = 0; i < zerosCount; i++) {
                result += `<color=#949494>0</color>`;
            }

            // Добавляем значащие цифры с подсветкой
            const startIndex = this.digitCount - maxLength;
            for (let i = startIndex; i < this.digitCount; i++) {
                const digit = valueStr[i] || '0';
                const targetDigit = targetStr[i] || '0';

                if (digit !== targetDigit) {
                    result += `<color=#FFFFFF>${ digit }</color>`;
                } else {
                    result += `<color=#949494>${ digit }</color>`;
                }
            }

            return result;
        } else {
            // Нули справа - упрощённая версия
            const valueWithoutZeros = value.toString();
            const zerosCount = this.digitCount - valueWithoutZeros.length;

            let result = `<color=#FFFFFF>${ valueWithoutZeros }</color>`;
            for (let i = 0; i < zerosCount; i++) {
                result += `<color=#949494>0</color>`;
            }

            return result;
        }
    }
}