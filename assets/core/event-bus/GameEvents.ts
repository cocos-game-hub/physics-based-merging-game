import { MergedData } from "db://assets/modules/merged/data/MergedData";
import { MergedObject } from "db://assets/modules/merged/view/MergedObject";

export const GAME_EVENTS = {
    MERGE: {
        COLLISION: 'merge:collision',
        EXECUTE: 'merge:execute',
        OBJECT_CREATED: 'merge:objectCreated',
    },
    GAMEPLAY: {
        RESET: 'gameplay:reset',
    }
};

export interface MergeCollisionEvent {
    dataA: MergedData;
    dataB: MergedData;
    objectA?: MergedObject;
    objectB?: MergedObject;
}

export interface MergeExecuteEvent {
    oldUuids: string[];
    newData: MergedData;
    position: { x: number; y: number };
}