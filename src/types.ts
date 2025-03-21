export type Position = {
    x: number,
    y: number
}


export type ShapeType = {
    name: string,
    requiredCoverage: number,
    autoPlayStartPosition: Position,
    autoPlayEndPosition: Position,
    handStartPosition: Position,
    handEndPosition: Position,
}

export enum GameState {
    STARTED = "started",
    FINISHED = "finished",
}