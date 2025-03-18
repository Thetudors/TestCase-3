import EventEmitter3 from "eventemitter3";

export class EventEmitter {
    private static _instance: EventEmitter;
    private _emitter: EventEmitter3;
    constructor() {
        this._emitter = new EventEmitter3();
    }

    public static get instance(): EventEmitter {
        if (!EventEmitter._instance) {
            EventEmitter._instance = new EventEmitter();
        }
        return EventEmitter._instance;
    }
    public on(event: string, listener: (...args: any[]) => void): void {
        this._emitter.on(event, listener);
    }
    public once(event: string, listener: (...args: any[]) => void): void {
        this._emitter.once(event, listener);
    }
    public off(event: string, listener: (...args: any[]) => void): void {
        this._emitter.off(event, listener);
    }
    public emit(event: string, ...args: any[]): void {
        this._emitter.emit(event, ...args);
    }
    public removeAllListeners(event?: string): void {
        this._emitter.removeAllListeners(event);
    }

}