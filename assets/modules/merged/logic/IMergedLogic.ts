import { MergedData } from "db://assets/modules/merged/data/MergedData";

export interface IMergedLogic {
    canMerge(dataA: MergedData, dataB: MergedData): boolean;

    calculateMergeResult(dataA: MergedData, dataB: MergedData): MergedData;

    calculateMergePosition(
        posA: { x: number; y: number },
        posB: { x: number; y: number }
    ): { x: number; y: number };

    handleCollision(dataA: MergedData, dataB: MergedData): void;
}