import { _decorator, CircleCollider2D, Component, Contact2DType, IPhysics2DContact, Label, RigidBody2D } from 'cc';
import { MergedData } from "../data/MergedData";
import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS, MergeCollisionEvent } from "db://assets/core/event-bus/GameEvents";
import { IMergedObject } from "db://assets/modules/merged/view/IMergedObject";
import logger from "db://assets/core/utils/console";

const { ccclass, property } = _decorator;

@ccclass('MergedObject')
export class MergedObject extends Component implements IMergedObject {
    @property(Label) declare label: Label | null;
    @property level: number = 1;

    private _collider: CircleCollider2D | null = null;
    private _rigidBody: RigidBody2D | null = null;
    private _isProcessing = false;

    private _data: MergedData | null = null;

    get data(): MergedData | null {
        if (this._data && this.node.isValid) {
            this._data.position = { x: this.node.position.x, y: this.node.position.y };
        }
        return this._data;
    }

    start() {
        this._collider = this.getComponent(CircleCollider2D);
        if (this._collider) {
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        this._rigidBody = this.getComponent(RigidBody2D);
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    setData(data: MergedData): void {
        this._data = data;
        this.level = data.level;
        if (this.label) {
            this.label.string = this.level.toString();
        }

        eventBus.emit(GAME_EVENTS.MERGE.OBJECT_CREATED, this);
    }

    setProcessing(value: boolean): void {
        this._isProcessing = value;
    }

    resetProcessing(): void {
        this._isProcessing = false;
    }

    reset(): void {
        this._isProcessing = false;

        if (!this._collider) {
            this._collider = this.getComponent(CircleCollider2D);
            if (this._collider) {
                this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            }
        } else {
            this._collider.enabled = true;
        }

        if (this._rigidBody) {
            this._rigidBody.enabled = true;
        }
    }

    private onBeginContact(self: CircleCollider2D, other: CircleCollider2D, contact: IPhysics2DContact) {
        logger.debug('[MergedObject]', 'onBeginContact called', {
            selfNode: self.node.name,
            otherNode: other.node.name,
            isProcessing: this._isProcessing,
            selfValid: this.node?.isValid,
            otherValid: other.node?.isValid
        });

        if (this._isProcessing) {
            logger.debug('[MergedObject]', 'Already processing, skip');
            return;
        }

        if (!this.node || !this.node.isValid) {
            logger.debug('[MergedObject]', 'Self node invalid, skip');
            return;
        }

        const objSelf = self.getComponent(MergedObject);
        const objOther = other.getComponent(MergedObject);

        logger.debug('[MergedObject]', 'Components found:', {
            objSelf: !!objSelf,
            objOther: !!objOther,
            selfData: !!objSelf?.data,
            otherData: !!objOther?.data
        });

        if (!objSelf || !objOther) {
            logger.debug('[MergedObject]', 'Missing MergedObject component');
            return;
        }

        if (!objSelf.data || !objOther.data) {
            logger.debug('[MergedObject]', 'Missing data');
            return;
        }

        objSelf.setProcessing(true);
        objOther.setProcessing(true);

        const event: MergeCollisionEvent = {
            dataA: objSelf.data,
            dataB: objOther.data,
            objectA: objSelf,
            objectB: objOther
        };

        logger.debug('[MergedObject]', 'Emitting MERGE_COLLISION', event);
        eventBus.emit(GAME_EVENTS.MERGE.COLLISION, event);
    }
}