import { Application, Container, Assets, Ticker } from 'pixi.js';
import { resize } from './resize/resize';
import { PORTRAITSIZE, LANDSCAPESIZE, SAFESIZE, SPRITES } from './config';
import { OrientationType } from './types';
import { SceneManager } from './scene/SceneManager';
import { SoundManager } from './sound/SoundManager';
import { SOUNDS } from './sound/config';
import { TranslatorManager } from './translator/TranslatorManager';

export class Engine {
    private _app: Application;
    private _mainContainer: Container = new Container();
    private _currentOrientation: OrientationType = OrientationType.LANDSCAPE;
    private readonly _backgroudColor: string = '#14042b';

    constructor() {
        this._app = new Application();
        (globalThis as any).__PIXI_APP__ = this._app;// For debugging purposes
    }

    async init() {
        await this._app.init({ background: this._backgroudColor, resizeTo: window, resolution: 1, antialias: false, autoDensity: true });
        document.getElementById("pixi-container")!.appendChild(this._app.canvas);

        this._mainContainer = new Container({ label: "Main_Container" });
        this._app.stage.addChild(this._mainContainer);

        // Add resize event listener
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('orientationchange', () => {
            setTimeout(this.handleResize.bind(this), 100);
        }); // Add orientation change event listener
        // Add orientation change event listener
        this.handleResize(); // Initial resize
        await this.loadAssets();
        await this.loadSounds();
        await this.loadFonts();
        await TranslatorManager.instance.detectBrowserLanguage();
        this.initGameLoop();
        return this;
    }

    private async loadAssets() {
        await Assets.load(SPRITES);
    }

    private async loadFonts() {
        const fontFace = new FontFace('sniglet-regular', 'url(assets/fonts/Sniglet-Regular.ttf)');
        try {
            // Fontun yüklenmesini bekle
            await fontFace.load();
            document.fonts.add(fontFace);
        } catch (err) {
            console.error("Font yüklenemedi:", err);
        }
    }

    private async loadSounds() {
         await SoundManager.instance.loadSounds(SOUNDS);
    }

    private initGameLoop(): void {
        this._app.ticker.add((delta: Ticker) => {
            SceneManager.instance.update(delta);
        });
    }

    private detectOrientation(): void {
        this._currentOrientation = window.innerWidth > window.innerHeight ?
            OrientationType.LANDSCAPE :
            OrientationType.PORTRAIT;
    }

    private handleResize(): void {
        this.detectOrientation();
        let gameSize = this._currentOrientation === OrientationType.LANDSCAPE ? LANDSCAPESIZE : PORTRAITSIZE;
        const { width, height } = resize(
            gameSize.width,
            gameSize.height,
            SAFESIZE.width,
            SAFESIZE.height,
            true
        );

        // Update renderer size
        this._app.renderer.resize(width, height);
        let scale: number;

        if (this._currentOrientation === OrientationType.PORTRAIT) {
            // Dynamic safety margin based on screen aspect ratio
            const aspectRatio = window.innerHeight / window.innerWidth;
            const safetyMargin = aspectRatio > 2 ? 0.65 : // Uzun telefonlar için (iPhone 12 Pro gibi)
                aspectRatio > 1.6 ? 0.75 : // Orta boy telefonlar için (iPhone SE gibi)
                    0.9; // Diğer durumlar için

            scale = (width / gameSize.width) * safetyMargin;
        } else {
            scale = Math.min(
                width / gameSize.width,
                height / gameSize.height
            );
        }

        this._mainContainer.scale.set(scale);
        this._mainContainer.x = width / 2;
        this._mainContainer.y = height / 2;

    }

    public addChild(object: any) {
        object.position.set(0, 0); // This will be center since mainContainer is centered
        this._mainContainer.addChild(object);
    }

    public get app() {
        return this._app;
    }
    public get mainContainer() : Container {
        return this._mainContainer;
    }
}