import { MergedData } from "db://assets/modules/merged/data/MergedData";

export interface IMergedObject {
    get data(): MergedData | null;

    setData(data: MergedData): void;

    setProcessing(value: boolean): void;

    resetProcessing(): void;

    reset(): void;
}