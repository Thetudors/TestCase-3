import { Container, Sprite, Text, TextStyle } from "pixi.js";

export class Button extends Container {
    private _background: Sprite;
    private _buttonText: Text;
    constructor(backgroundTexture: string, text: string, style: TextStyle, parent: Container) {
        super();
        this._background = Sprite.from(backgroundTexture);
        this._background.anchor.set(0.5);
        this._background.label = 'ButtonBackground';
        this._background.interactive = true;
        this.addChild(this._background);
        this._buttonText = new Text({ text, style });
        this._buttonText.anchor.set(0.5);
        this._buttonText.label = 'ButtonText';
        this.addChild(this._buttonText);
        parent.addChild(this);
    }

    public onButtonClick(callback: () => void): void {
        this._background.on('pointerdown', callback);
    }

    public set text(value: string) {
        this._buttonText.text = value;
    }
}