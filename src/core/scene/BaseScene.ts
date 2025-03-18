import { Container, Ticker } from "pixi.js";
import { OrientationType } from "../types";

export abstract class BaseScene extends Container {
    protected _isActive: boolean = false;
    protected _currentOrientation: OrientationType = OrientationType.LANDSCAPE;

    constructor() {
        super();
        window.addEventListener('orientationchange', this.detectOrientation.bind(this));
        this._currentOrientation = window.innerWidth > window.innerHeight ?
            OrientationType.LANDSCAPE :
            OrientationType.PORTRAIT;

    }

    public show(): void {
        this._isActive = true;
        this.visible = true;
        this.onShow();
    }
    public hide(): void {
        this._isActive = false;
        this.visible = false;
        this.onHide();
    }

    private detectOrientation(): void {
        if (!this._isActive) return;
        setTimeout(() => {
            this._currentOrientation = window.innerWidth > window.innerHeight ?
                OrientationType.LANDSCAPE :
                OrientationType.PORTRAIT;
            this.onOrientationChange(this._currentOrientation);
        }, 100);
    }

    abstract onShow(): void;
    
    abstract onHide(): void;

    abstract update(delta: Ticker): void;

    abstract resize(): void;

    abstract onOrientationChange(orientationType: OrientationType): void; // corrected parameter name for clarity

    public get currentOrientation(): OrientationType {
        return this._currentOrientation
    }
    public IsActive(): boolean {
        return this._isActive;
    }

}