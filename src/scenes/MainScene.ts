import { Sprite, Text, ParticleContainer, Particle, Texture, Ticker, Graphics, Container, TextStyle } from "pixi.js";
import { BaseScene } from "../core/scene/BaseScene";
import { OrientationType } from "../core/types";
import { gsap } from "gsap";
import { SoundManager } from "../core/sound/SoundManager";
import { DrawManager } from "../managers/DrawManager";
import { SHAPES } from "../config";
import { TranslatorManager } from "../core/translator/TranslatorManager";
import { ProgressBar } from "../components/ProgressBar";
import { AutoplayManager } from "../managers/AutoPlayManager";
import { EventEmitter } from "../core/events/EventEmitter";
import { AllShapesCompleted, OnGoEndShape, ShapeBurned, ShapeCompleted, ShapeWinAnimationComplete } from "../core/events/types";
import { Button } from "../core/components/Button";

export class MainScene extends BaseScene {

    private _background!: Sprite;
    private _drawManager!: DrawManager;
    private _progressBar!: ProgressBar;
    private _autoPlayManager!: AutoplayManager; // Placeholder for the AutoPlayManager

    private _InfoTitleText!: Text;
    private _InfoDescriptionText!: Text;

    private _particleContainer!: ParticleContainer;

    private _dimmer!: Graphics;

    private _losePopupContainer!: Container;
    private _shapeCompletedPopup!: Container;
    private _downloadAppPopup!: Container;

    private _timeRemaining: number = 15; // Placeholder for the remaining time
    private _warningFrame!: Graphics;
    private _timerActive: boolean = false;
    private _warningAnimation: gsap.core.Tween | gsap.core.Timeline | null = null;
    private _timerInterval: number = 0;

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
        EventEmitter.instance.on(ShapeBurned, this.showShapeBurnAnimation.bind(this));
        EventEmitter.instance.on(ShapeCompleted, this.showShapeCompletedAnimation.bind(this));
        EventEmitter.instance.on(AllShapesCompleted, this.showDownloadAppPopup.bind(this));

    }
    private dispose(): void {
        EventEmitter.instance.off(ShapeBurned, this.showShapeBurnAnimation.bind(this));
        EventEmitter.instance.off(ShapeCompleted, this.showShapeCompletedAnimation.bind(this));
        EventEmitter.instance.off(AllShapesCompleted, this.showDownloadAppPopup.bind(this));
        // this._drawManager.dispose();
        this._autoPlayManager.dispose();
        this._particleContainer.destroy();
        this._confetti = [];
    }

    private initDisplay(): void {
        this._background = Sprite.from('mainscenebackground');
        this._background.anchor.set(0.5);
        this._background.label = 'MainSceneBackground';
        this.addChild(this._background);

        this._dimmer = new Graphics().rect(-400, -900, 900, 1600).fill({ color: 0x000000, alpha: 0.75 });
        this._dimmer.label = 'Dimmer';
        this._dimmer.alpha = 0;
        this.addChild(this._dimmer);

        this._InfoTitleText = new Text({ text: TranslatorManager.instance.translate('CAN YOU DRAW IT'), style: { fontSize: 50, fill: 'white', fontFamily: "sniglet-regular", fontWeight: "bold" } });
        this._InfoTitleText.label = 'InfoTitleText';
        this._InfoTitleText.anchor.set(0.5);
        this._InfoTitleText.position.set(0, -475);
        this.addChild(this._InfoTitleText);

        this._InfoDescriptionText = new Text({ text: TranslatorManager.instance.translate('no lifting finger and overlapping lines'), style: { fontSize: 30, fill: 'red', fontFamily: "sniglet-regular" } });
        this._InfoDescriptionText.label = 'InfoDescriptionText';
        this._InfoDescriptionText.anchor.set(0.5);
        this._InfoDescriptionText.position.set(0, -425);
        this.addChild(this._InfoDescriptionText);

        this._progressBar = new ProgressBar({
            background: 'progressbarbg',
            fill: 'progressbarfill',
            icon: 'icon',
            width: 600,
            height: 60,
            iconScale: 1.15,
            iconOffset: 10
        });
        this._progressBar.position.set(-300, -370);
        this._progressBar.label = 'ProgressBar';

        this.addChild(this._progressBar);

        this._drawManager = new DrawManager(SHAPES, this._progressBar);
        this._drawManager.label = 'DrawManager';
        this.addChild(this._drawManager);

        //LOSE POPUP
        this._losePopupContainer = new Container();
        this._losePopupContainer.label = 'LosePopupContainer';
        this._losePopupContainer.position.set(0, 0);
        this._losePopupContainer.visible = false; // Initially hidden
        this.addChild(this._losePopupContainer);

        let losePopupText = new Text({ text: TranslatorManager.instance.translate('FAIL'), style: { fontSize: 50, fill: 'white', fontFamily: "sniglet-regular", fontWeight: "bold" } });
        losePopupText.anchor.set(0.5);
        losePopupText.position.set(0, 0);
        this._losePopupContainer.addChild(losePopupText);

        let tryAgainText = new Text({ text: TranslatorManager.instance.translate('TRY AGAIN'), style: { fontSize: 30, fill: 'white', fontFamily: "sniglet-regular" } });
        tryAgainText.anchor.set(0.5);
        tryAgainText.position.set(0, 100);
        this._losePopupContainer.addChild(tryAgainText);

        let losePopupImage = Sprite.from('failimage');
        losePopupImage.anchor.set(0.5);
        losePopupImage.position.set(0, 250);
        this._losePopupContainer.addChild(losePopupImage);

        // Shape Completed Popup 
        this._shapeCompletedPopup = new Container();
        this._shapeCompletedPopup.label = 'ShapeCompletedPopup';
        this._shapeCompletedPopup.position.set(0, 0);
        this._shapeCompletedPopup.visible = false; // Initially hidden
        this.addChild(this._shapeCompletedPopup);

        let shapeCompletedText = new Text({ text: TranslatorManager.instance.translate('WELL DONE'), style: { fontSize: 50, fill: 'white', fontFamily: "sniglet-regular", fontWeight: "bold" } });
        shapeCompletedText.anchor.set(0.5);
        shapeCompletedText.position.set(0, 0);
        this._shapeCompletedPopup.addChild(shapeCompletedText);

        let shapeCompletedImage = Sprite.from('welldoneimage');
        shapeCompletedImage.anchor.set(0.5);
        shapeCompletedImage.position.set(0, 100);
        this._shapeCompletedPopup.addChild(shapeCompletedImage);

        this._downloadAppPopup = new Container();
        this._downloadAppPopup.label = 'DownloadAppPopup';
        this._downloadAppPopup.position.set(0, 0);
        this._downloadAppPopup.visible = false; // Initially hidden
        this.addChild(this._downloadAppPopup);

        let downloadAppText = new Text({ text: TranslatorManager.instance.translate('WELL DONE'), style: { fontSize: 50, fill: 'white', fontFamily: "sniglet-regular", fontWeight: "bold" } });
        downloadAppText.anchor.set(0.5);
        downloadAppText.position.set(0, 0);
        this._downloadAppPopup.addChild(downloadAppText);

        let downloadAppImage = Sprite.from('welldoneimage');
        downloadAppImage.anchor.set(0.5);
        downloadAppImage.position.set(0, 100);
        this._downloadAppPopup.addChild(downloadAppImage);

        let downloadButton = new Button('downloadbutton', TranslatorManager.instance.translate("INSTALL"), new TextStyle({ fill: 0xfafafa, fontFamily: "sniglet-regular" }), this._downloadAppPopup);
        downloadButton.label = 'DownloadButton';
        downloadButton.position.set(0, 350);
        gsap.fromTo(downloadButton.scale, { x: 1, y: 1 }, { x: 1.25, y: 1.25, duration: 0.35, repeat: -1, yoyo: true });
        downloadButton.onButtonClick(() => {
            alert("Redirecting to the download page...");
            EventEmitter.instance.emit(OnGoEndShape);
            this._downloadAppPopup.visible = false;
            this._dimmer.alpha = 0;
        });


        this._warningFrame = new Graphics()
            .rect(-290, -500, 580, 1000)
            .stroke({ color: 0xFF0000, width: 90, alpha: 1 });
        this._warningFrame.label = 'WarningFrame';
        this.addChild(this._warningFrame);

        this._autoPlayManager = new AutoplayManager(this._drawManager);

        this._particleContainer = new ParticleContainer({
            dynamicProperties: {
                position: true,
                scale: false,
                rotation: true,
                color: false
            }
        });
        this._particleContainer.zIndex = 2;
        this._particleContainer.label = 'ParticleContainer';
        this.addChild(this._particleContainer);
    }

    private playConfetti(): void {
        SoundManager.instance.playSound('confetti', { volume: 0.05 });

        this._confetti.forEach(c => this._particleContainer.removeParticle(c.particle));
        this._confetti = [];
        const texture = Texture.from('rect');

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
        this.startTimer();
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

    private showShapeBurnAnimation(): void {
        SoundManager.instance.playSound('lose', { volume: 0.05 });
        gsap.to(this._dimmer, {
            duration: 0.5,
            alpha: 1,
            onComplete: () => {
                this._losePopupContainer.visible = true;
                window.setTimeout(() => {
                    this._losePopupContainer.visible = false;
                    this._dimmer.alpha = 0;
                }, 1500);
            }
        });
    }

    private showShapeCompletedAnimation(): void {
        this.stopTimer();
        gsap.to(this._dimmer, {
            duration: 0.5,
            alpha: 1,
            onComplete: () => {
                this.playConfetti();
                this._shapeCompletedPopup.visible = true;
                window.setTimeout(() => {
                    this._shapeCompletedPopup.visible = false;
                    this._dimmer.alpha = 0;
                    EventEmitter.instance.emit(ShapeWinAnimationComplete);
                    this.startTimer();
                }, 1500);
            }
        });
    }

    private showDownloadAppPopup(): void {
        gsap.to(this._dimmer, {
            duration: 0.5,
            alpha: 1,
            onComplete: () => {
                this.playConfetti();
                this._downloadAppPopup.visible = true;
            }
        });
    }

    // Add timer update method
    private updateTimer(): void {
        if (!this._timerActive) return;
        this._timeRemaining -= 1;
        // Start warning at 7 seconds
        if (this._timeRemaining <= 7 && !this._warningAnimation) {
            this.startWarningAnimation();
        }

        // Timer expired
        if (this._timeRemaining <= 0) {
            this.handleTimerExpired();
        }
    }
    // Start the flashing warning animation
    private startWarningAnimation(): void {
        // Kill any existing animation
        if (this._warningAnimation) {
            this._warningAnimation.kill();
        }
        // Reset alpha
        this._warningFrame.alpha = 0;

        // Create flashing animation
        this._warningAnimation = gsap.fromTo(this._warningFrame, {
            alpha: 0.5,
        }, {
            alpha: 0,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            onComplete: () => {
                this._warningFrame.alpha = 1;
            }
        });
    }

    // Handle timer expiration
    private handleTimerExpired(): void {
        this.stopTimer();

        // Show the burn animation just like when path is crossed
        this.showDownloadAppPopup();
        this._autoPlayManager.dispose();
    }

    public startTimer(): void {
        // Clear any existing timer
        this.stopTimer();

        // Reset timer state
        this._timeRemaining = 15;
        this._timerActive = true;

        // Start interval for countdown
        this._timerInterval = window.setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    // Stop the timer
    public stopTimer(): void {
        this._timerActive = false;
        window.clearInterval(this._timerInterval);

        // Stop warning animation if running
        if (this._warningAnimation) {
            this._warningAnimation.kill();
            this._warningAnimation = null;
        }

        // Reset warning frame
        this._warningFrame.alpha = 0;
    }

    public resize(): void {
        this.onOrientationChange(this._currentOrientation);
    }

    public onOrientationChange(orientation: OrientationType): void {

        switch (orientation) {
            case OrientationType.PORTRAIT:
                this._background.scale.set(1);
                break;
            case OrientationType.LANDSCAPE:
                this._background.scale.set(1.75);
                break;
            default:
                break;
        }
    }
}