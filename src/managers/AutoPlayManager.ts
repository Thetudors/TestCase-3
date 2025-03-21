import { DrawManager } from "./DrawManager";

export class AutoplayManager {
    private _drawManager: DrawManager;
    private _inActiveTimer: number | null = null;
    private readonly INACTIVITY_THRESHOLD: number = 5000;

    constructor(drawManager: DrawManager) {
        this._drawManager = drawManager;
        this.EventListeners();
        this.resetInavtivityTimer();
    }

    private EventListeners(): void {
        window.addEventListener('touchstart', this.resetInavtivityTimer.bind(this));
        window.addEventListener('touchmove', this.resetInavtivityTimer.bind(this));
    }
    dispose(): void {
        window.removeEventListener('touchstart', this.resetInavtivityTimer.bind(this));
        window.removeEventListener('touchmove', this.resetInavtivityTimer.bind(this));
    }

    private resetInavtivityTimer(): void {
        if (this._inActiveTimer) {
            clearTimeout(this._inActiveTimer);
            this._drawManager.stopAutoDrawAnimation();

        }
        this._inActiveTimer = window.setTimeout(this.startAutoPlay.bind(this), this.INACTIVITY_THRESHOLD);
    }

    private startAutoPlay(): void {
        this._drawManager.startAutoDrawAnimation()
        // Logic to start autoplay goes here
    }


}