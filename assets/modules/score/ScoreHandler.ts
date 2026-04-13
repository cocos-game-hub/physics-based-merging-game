import { _decorator, Component, Label } from 'cc';
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS, MergeExecuteEvent } from "db://assets/core/event-bus/GameEvents";

const { ccclass, property } = _decorator;

@ccclass('ScoreHandler')
export class ScoreHandler extends Component {
    @property(Label) declare score: Label;
    @property(Label) declare maxScore: Label;

    private _score: number = 0;
    private _maxScore: number = 0;

    start() {
        eventBus.on(GAME_EVENTS.MERGE.EXECUTE, this.onMergeExecute, this);
    }

    update(deltaTime: number) {

    }

    private onMergeExecute(event: MergeExecuteEvent) {
        this._score += event.newData.level;
        if (this._score > this._maxScore) {
            this._maxScore = this._score;
        }

        this.score.string = `Score: ${ this._score }`;
        this.maxScore.string = `Max score: ${ this._maxScore }`;
    }
}


