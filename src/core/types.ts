export type GameSize = {
    width: number,
    height: number
}
export enum OrientationType {
    PORTRAIT = 'PORTRAIT',
    LANDSCAPE = 'LANDSCAPE'
}
export type spriteConfig={
    alias:string,
    src:string,
}
export enum MessageType {
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
    INFO = 'INFO'
}