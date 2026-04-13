export class MergedData {
    uuid: string;
    level: number;
    color: MergedColor;
    position: { x: number; y: number };

    constructor(uuid: string, level: number, color: MergedColor, position: { x: number; y: number }) {
        this.uuid = uuid;
        this.level = level;
        this.color = color;
        this.position = { x: position.x, y: position.y };
    }

    static fromVec3(uuid: string, level: number, color: MergedColor, vec: {
        x: number;
        y: number;
        z?: number
    }): MergedData {
        return new MergedData(uuid, level, color, { x: vec.x, y: vec.y });
    }
}

export enum MergedColor {
    RED = '#D64040',
    BLUE = '#4088D6',
    GREEN = '#52D640',
    PURPLE = '#8840D6',
    YELLOW = '#D6D640',
    PINK = '#D640CA'
}