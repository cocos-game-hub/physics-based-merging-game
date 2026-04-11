import { eventBus } from "db://assets/core/event-bus/EventBus";
import { GAME_EVENTS, MergeExecuteEvent } from "db://assets/core/event-bus/GameEvents";
import { MergedData } from "../data/MergedData";
import { v4 as uuidv4 } from 'uuid';
import { IMergedLogic } from "db://assets/modules/merged/logic/IMergedLogic";
import logger from "db://assets/core/utils/console";
import { MergedManager } from "db://assets/modules/merged/view/MergedManager";

export class MergedLogic implements IMergedLogic {
    public canMerge(dataA: MergedData, dataB: MergedData): boolean {
        return dataA.level === dataB.level;
    }

    public calculateMergeResult(dataA: MergedData, dataB: MergedData): MergedData {
        const newUuid = uuidv4();
        const newLevel = dataA.level + 1;
        const newPosition = this.calculateMergePosition(dataA.position, dataB.position);

        return new MergedData(newUuid, newLevel, newPosition);
    }

    public calculateMergePosition(
        posA: { x: number; y: number },
        posB: { x: number; y: number }
    ): { x: number; y: number } {
        return {
            x: (posA.x + posB.x) / 2,
            y: (posA.y + posB.y) / 2
        };
    }

    public handleCollision(dataA: MergedData, dataB: MergedData): void {
        logger.debug('[MergedLogic]', 'HandleCollision', {
            dataA: { uuid: dataA.uuid, level: dataA.level },
            dataB: { uuid: dataB.uuid, level: dataB.level }
        });

        if (!this.canMerge(dataA, dataB)) {
            logger.debug('[MergedLogic]', 'Cannot merge - different levels');
            return;
        }

        const manager = MergedManager.getInstance();
        const map = manager.getObjectMap();

        if (!map.has(dataA.uuid) || !map.has(dataB.uuid)) {
            logger.debug('[MergedLogic]', 'Objects already destroyed');
            return;
        }

        const newData = this.calculateMergeResult(dataA, dataB);

        logger.debug('[MergedLogic]', 'Merge result calculated:', newData);

        const event: MergeExecuteEvent = {
            oldUuids: [dataA.uuid, dataB.uuid],
            newData: newData,
            position: newData.position
        };

        logger.debug('[MergedLogic]', 'Emitting MERGE_EXECUTE', event);
        eventBus.emit(GAME_EVENTS.MERGE.EXECUTE, event);
    }
}