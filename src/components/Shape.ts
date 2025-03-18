import { Container, FederatedPointerEvent, Sprite } from "pixi.js";

export class Shape extends Sprite {
    private _progress: number = 0;
    private _positions: Set<string> = new Set<string>();
    
    constructor(shape: string) {
        super(Sprite.from(shape));
        this.extractNonTransparentPixels();
        // Make the shape interactive
        this.eventMode = 'static';
        this.cursor = 'pointer';
        // Add pointer event handlers
        this.on('pointerdown', this.onPointerDown.bind(this));
    }
    
    // Event handler for when the user clicks/touches the shape
    private onPointerDown(event: FederatedPointerEvent): void {
        // Calculate relative position within the shape
        const localPos = this.toLocal(event.global);
        
        // Convert to coordinates relative to the texture
        const x = Math.floor(localPos.x + this.width/2);
        const y = Math.floor(localPos.y + this.height/2);
        
        // Emit a custom event that the DrawManager can listen for
        this.emit('shapeClicked', { x, y, shape: this });
    }
    
    private extractNonTransparentPixels(): void {
        // Get texture dimensions
        const width = this.texture.width;
        const height = this.texture.height;

        // Create a canvas to analyze pixels
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            console.error("Canvas context could not be created");
            return;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        try {
            // In PixiJS v8, access the texture source directly
            const textureSource = this.texture.source;

            // Check what type of source we have and get the underlying resource
            if ('resource' in textureSource) {
                // For ImageSource
                if (textureSource.resource instanceof HTMLImageElement ||
                    textureSource.resource instanceof HTMLCanvasElement ||
                    textureSource.resource instanceof ImageBitmap) {
                    context.drawImage(textureSource.resource, 0, 0);
                }
            }
            // For CanvasSource
            else if ('canvas' in textureSource) {
                context.drawImage(textureSource['canvas'], 0, 0);
            }
            else {
                console.error("Cannot access valid texture source");
                return;
            }

            // Get pixel data
            const imageData = context.getImageData(0, 0, width, height);
            const pixels = imageData.data;

            // Find non-transparent pixels
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    const alpha = pixels[index + 3]; // Alpha channel
                    if (alpha > 0) {
                        // Store position with alpha value
                        const key = `${x},${y}`;
                        this._positions.add(key);
                    }
                }
            }

            console.log("Non-transparent pixels extracted:", this._positions.size);
            console.log("Positions:", Array.from(this._positions).slice(0, 10)); // Log first 10 positions
        } catch (error) {
            console.error("Error accessing texture source:", error);
        }
    }

    public get getPositions(): Set<string> {
        return this._positions;
    }
    
    // Find the closest non-transparent pixel to the touch point
    public findClosestPosition(x: number, y: number): {x: number, y: number} {
        // Convert positions to points
        const points = Array.from(this._positions).map(posStr => {
            const [posX, posY] = posStr.split(',').map(Number);
            return {x: posX, y: posY};
        });
        
        // Find closest point
        let closest = points[0];
        let minDistance = Number.MAX_VALUE;
        
        for (const point of points) {
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                closest = point;
            }
        }
        
        return closest;
    }
}