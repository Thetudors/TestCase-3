import { Sprite, TextStyle, ParticleContainer, Particle, Texture, Ticker } from "pixi.js";
import { Button } from "../core/components/Button";
import { BaseScene } from "../core/scene/BaseScene";
import { OrientationType } from "../core/types";
import { gsap } from "gsap";
import { SoundManager } from "../core/sound/SoundManager";
import { Shape } from "../components/Shape";
import { DrawManager } from "../managers/DrawManager";
import { SHAPES } from "../config";
import { TranslatorManager } from "../core/translator/TranslatorManager";
import { ProgressBar } from "../components/ProgressBar";

export class MainScene extends BaseScene {

    private _background!: Sprite;
    private _playNowButton!: Button;
    private _drawManager!: DrawManager;

    private _particleContainer!: ParticleContainer;

    private _confetti: Array<{
        particle: Particle,
        vx: number,
        vy: number,
        rotation: number,
    }> = [];

    constructor() {
        super();
        this.initDisplay();
        this.eventListeners();
    }

    private eventListeners(): void {

    }
    private dispose(): void {
    }

    private initDisplay(): void {
        this._background = Sprite.from('mainscenebackground');
        this._background.anchor.set(0.5);
        this._background.label = 'MainSceneBackground';
        this.addChild(this._background);

        this._drawManager = new DrawManager(SHAPES);
        this.addChild(this._drawManager);

        this._playNowButton = new Button('buttonbg', TranslatorManager.instance.translate('CAN YOU DRAW IT'), new TextStyle({ fill: 0xfafafa, fontFamily: "sniglet-regular" }), this);
        this._playNowButton.label = 'PlayNowButton';
        this._playNowButton.position.set(0, 485);
        gsap.fromTo(this._playNowButton.scale, { x: 1, y: 1 }, { x: 1.25, y: 1.25, duration: 0.35, repeat: -1, yoyo: true });
        this._playNowButton.onButtonClick(() => {
            console.log('Play Now Button Clicked');
        });

        let progressbar = new ProgressBar({
            background: 'progressbarbg',
            fill: 'progressbarfill',
            icon: 'icon',
            width: 600,
            height: 60,
            iconScale: 1.15,
            iconOffset: 10
        });
        progressbar.position.set(-300, -370);
        progressbar.animateProgress(0.56, 1);
        
        this.addChild(progressbar);

        this._particleContainer = new ParticleContainer({
            dynamicProperties: {
                position: true,
                scale: false,
                rotation: true,
                color: false
            }
        });
        this._particleContainer.zIndex = 2;
        this.addChild(this._particleContainer);
    }



    private playConfetti(): void {

        this._confetti.forEach(c => this._particleContainer.removeParticle(c.particle));
        this._confetti = [];
        const texture = Texture.from('letterbackground');

        for (let i = 0; i < 100; ++i) {

            const x = -400 + Math.random() * 800;
            const y = -600;

            const scale = 0.05 + Math.random() * 0.15;
            const colors = [0xFFD700, 0xFF6347, 0x32CD32, 0x4169E1, 0xFF69B4, 0x9370DB];
            const tint = colors[Math.floor(Math.random() * colors.length)];

            const particle = new Particle({
                texture,
                x: x,
                y: y,
                scaleX: scale - 0.10,
                scaleY: scale,
                tint: tint,
                rotation: Math.random() * Math.PI * 2
            });

            this._particleContainer.addParticle(particle);
            this._confetti.push({
                particle,
                vx: -2 + Math.random() * 4,
                vy: 3 + Math.random() * 8,
                rotation: -0.03 + Math.random() * 0.06
            });
        }
    }

    public onShow(): void {
        SoundManager.instance.playSound('theme', { loop: true, volume: 0.05 });
    }

    public onHide(): void {

        this.dispose();
        SoundManager.instance.stopSound('theme');
    }

    public update(delta: Ticker): void {
        this.confettiUpdate(delta);
    }
    private confettiUpdate(delta: Ticker): void {
        if (this._confetti.length === 0) return;
        for (let i = this._confetti.length - 1; i >= 0; i--) {
            const conf = this._confetti[i];
            const p = conf.particle;

            p.x += conf.vx * delta.deltaTime;
            p.y += conf.vy * delta.deltaTime;

            p.rotation += conf.rotation * delta.deltaTime;

            if (p.y > 800) {
                this._particleContainer.removeParticle(p);
                this._confetti.splice(i, 1);
            }
        }
    }


    public resize(): void {
        this.onOrientationChange(this._currentOrientation);
    }

    public onOrientationChange(orientation: OrientationType): void {

        switch (orientation) {
            case OrientationType.PORTRAIT:
                this._background.scale.set(1);
                this._playNowButton.position.set(0, 485);
                break;
            case OrientationType.LANDSCAPE:
                this._background.scale.set(1.75);
                this._playNowButton.position.set(500, 300);
                break;
            default:
                break;
        }
    }
}