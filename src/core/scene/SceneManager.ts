import { Container, Ticker } from 'pixi.js';
import { Engine } from '../Engine';
import { BaseScene } from './BaseScene';
import { OrientationType } from '../types';

export class SceneManager {
    private static _instance: SceneManager;
    private _currentScene: BaseScene | null = null;
    private _scenes: Map<string, BaseScene> = new Map();
    private _engine: Engine;
    private _container: Container;

    private constructor(engine: Engine) {
        this._engine = engine;
        this._container = new Container({ label: 'SceneManager' });
        this._container.sortableChildren = true;
        this._engine.addChild(this._container);
    }

    public static init(engine: Engine): SceneManager {
        if (!SceneManager._instance) {
            SceneManager._instance = new SceneManager(engine);
        }
        return SceneManager._instance;
    }

    public static get instance(): SceneManager {
        if (!SceneManager._instance) {
            throw new Error("SceneManager not initialized");
        }
        return SceneManager._instance;
    }

    public addScene(name: string, scene: BaseScene): void {
        this._scenes.set(name, scene);
        if (!this._currentScene) {
            this._currentScene = scene;
            this._container.addChild(scene);
            scene.show();
            this.onOrientationChange(this._currentScene.currentOrientation);
        }
    }

    public switchScene(name: string): void {
        if (!this._scenes.has(name)) {
            throw new Error(`Scene ${name} not found`);
        }

        if (this._currentScene) {
            this._currentScene.hide();
            this._container.removeChild(this._currentScene);
        }

        this._currentScene = this._scenes.get(name)!;
        this._container.addChild(this._currentScene);
        this._currentScene.show();
        this.onOrientationChange(this._currentScene.currentOrientation);

    }

    public update(delta: Ticker): void {
        if (this._currentScene) {
            this._currentScene.update(delta);
        }
    }

    public resize(): void {
        if (this._currentScene) {
            this._currentScene.resize();
        }
    }
    
    public onOrientationChange(orientation: OrientationType): void {
        if (this._currentScene) {
            this._currentScene.onOrientationChange(orientation);
        }
    }
}
