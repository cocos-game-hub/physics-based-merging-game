export class MergedData {
    uuid: string;
    level: number;
    position: { x: number; y: number };

    constructor(uuid: string, level: number, position: { x: number; y: number }) {
        this.uuid = uuid;
        this.level = level;
        this.position = { x: position.x, y: position.y };
    }

    static fromVec3(uuid: string, level: number, vec: { x: number; y: number; z?: number }): MergedData {
        return new MergedData(uuid, level, { x: vec.x, y: vec.y });
    }
}