import { Container, Graphics, Sprite } from "pixi.js";
import { ProgressBarOptions } from "./types";
import gsap from "gsap";

export class ProgressBar extends Container {
    private _background!: Sprite;
    private _fill!: Sprite;
    private _icon!: Sprite;
    private _mask!: Graphics;
    private _progress: number = 0;
    private _animation: gsap.core.Tween | null = null;
    private _iconOffset: number = 0;


    constructor(options: ProgressBarOptions) {
        super();

        this._background = Sprite.from(options.background);
        this._background.width = options.width || 250;
        this._background.height = options.height || 40;
        this._background.label = 'ProgressBarBackground';
        this.addChild(this._background);

        this._fill = Sprite.from(options.fill);
        this._fill.width = this._background.width || 250;
        this._fill.height = this._background.height || 40;
        this._fill.label = 'ProgressBarFill';
        this.addChild(this._fill);

        this._icon = Sprite.from(options.icon);
        this._icon.anchor.set(0.5);
        this._icon.scale.set(options.iconScale || 1);
        this._icon.label = 'ProgressBarIcon';
        this.addChild(this._icon);

        this._iconOffset = options.iconOffset || 0;

        // Create a mask for the fill
        this._mask = new Graphics();
        this._mask.label = 'ProgressBarMask';
        this.addChild(this._mask);
        this._fill.mask = this._mask;
        this.update();

    }
    private update(): void {
        const maskWidth = this._background.width * this._progress;
        this._mask.clear();
        this._mask.rect(0, 0, maskWidth, this._background.height);
        this._mask.fill(0xFFFFFF);

        this._icon.x = this._background.x + maskWidth + this._iconOffset;
        this._icon.y = this._background.y + this._background.height / 2;
    }
    public set progress(value: number) {
        this._progress = Math.max(0, Math.min(1, value));
        this.update();
    }

    /**
     * Animate the progress bar smoothly using GSAP
     * @param value Target progress value (0-1)
     * @param duration Animation duration in seconds
     */
    public animateProgress(value: number, duration: number = 0.5): void {
        // Clamp value between 0 and 1
        value = Math.max(0, Math.min(1, value));
        
        // Kill any existing animation
        if (this._animation) {
            this._animation.kill();
        }
        
        // Create new animation
        this._animation = gsap.to(this, {
            _progress: value,
            duration: duration,
            ease: "power2.out",
            onUpdate: () => this.update(),
            onComplete: () => {
                this._animation = null;
            }
        });
    }
}