import { Container, FederatedPointerEvent, Graphics, Point, Sprite } from "pixi.js";
import { Shape } from "../components/Shape";
import { ShapeType } from "../types";
import { SHAPES } from "../config";
import { getLinePoints } from "../core/utils/position";

export class DrawManager extends Container {
    private _shapes: Shape[] = [];
    private _backround!: Sprite;
    private _pointsContainer: Container = new Container(); // Container for point graphics
    private currentShapeIndex: number = 0;
    private _isDrawing: boolean = false;
    private _lastPoint: Point | null = null;
    private _pathPoints: Point[] = []; // Store all points for tracking
    private _drawnPixels: Set<string> = new Set<string>();  // Track where we've already drawn
    private _shapeProgress: number = 0;                    // Track completion percentage
    private _isBurned: boolean = false;                    // Whether player has failed by crossing their path
    private _isCompleted: boolean = false;                 // Whether shape is completed
    private _requiredCoverage: number = 0;                 // % of shape that must be covered to win
    private _pointColor: number = 0x00FF00;                // Color of point graphics
    
    private _burnThreshold: number = 1500;                   // Minimum number of already-drawn pixels to trigger burn
    private _safePathLength: number = 1000;                  // Number of recent points to ignore for crossing detection

    private readonly POINT_RADIUS: number = 3; // Radius of each point graphic
    
    constructor(Shapes: ShapeType[] = []) {
        super();
        this.initDisplay();
        this.createShapes(Shapes);
        this.setupInteraction();
        this.addChild(this._pointsContainer); // Add the points container
    }

    private initDisplay(): void {
        this._backround = Sprite.from('frame');
        this._backround.anchor.set(0.5);
        this._backround.label = 'DrawManagerBackground';
        this.addChild(this._backround);
    }

    private createShapes(Shapes: ShapeType[]): void {
        this._shapes = Shapes.map((shape) => {
            const shapeInstance = new Shape(shape.name);
            shapeInstance.anchor.set(0.5);
            shapeInstance.scale.set(1);
            shapeInstance.position.set(0, 0);
            shapeInstance.visible = false;
            this.addChild(shapeInstance);
            return shapeInstance;
        });
        this.currentShapeIndex = 1;
        if (this._shapes.length > 0) {
            this._shapes[1].visible = true;
            this._requiredCoverage = SHAPES[this.currentShapeIndex].requiredCoverage;
        }
    }

    private setupInteraction(): void {
        // Make the current shape interactive
        this.eventMode = 'static';

        // Set up event listeners for the entire container
        this.on('pointerdown', this.onPointerDown);
        this.on('pointermove', this.onPointerMove);
        this.on('pointerup', this.onPointerUp);
        this.on('pointerupoutside', this.onPointerUp);
    }

    private onPointerDown = (event: FederatedPointerEvent): void => {
        const currentShape = this._shapes[this.currentShapeIndex];
        if (!currentShape) return;

        // Convert global coordinates to shape's local coordinates
        const localPos = currentShape.toLocal(event.global);

        // Convert to texture coordinates - account for anchor point and scale
        const textureX = Math.floor((localPos.x / currentShape.scale.x) + currentShape.texture.width / 2);
        const textureY = Math.floor((localPos.y / currentShape.scale.y) + currentShape.texture.height / 2);

        // Check if this point is part of the shape (non-transparent pixel)
        const key = `${textureX},${textureY}`;
        const positions = currentShape.getPositions;

        // Reset for new drawing
        this._pathPoints = [];
        this._pointsContainer.removeChildren();
        this._drawnPixels = new Set<string>();
        this._isBurned = false;
        this._isCompleted = false;
        this._shapeProgress = 0;

        if (positions.has(key)) {
            // Start drawing
            this._isDrawing = true;
            this._lastPoint = new Point(textureX, textureY);

            // Fill points around the touch position
            this.fillPointsAround(currentShape, textureX, textureY);
            
        } else {
            // Try to find the closest non-transparent pixel
            const closestPoint = this.findClosestShapePixel(currentShape, textureX, textureY, 10);

            if (closestPoint) {
                this._isDrawing = true;
                this._lastPoint = closestPoint;

                // Fill points around the closest point
                this.fillPointsAround(currentShape, closestPoint.x, closestPoint.y);
            }
        }
    };

    // Update to fill points instead of drawing a line
    private onPointerMove = (event: FederatedPointerEvent): void => {
        if (!this._isDrawing || !this._lastPoint || this._isBurned) return;

        const currentShape = this._shapes[this.currentShapeIndex];
        if (!currentShape) return;

        // Get current position - use same conversion as in onPointerDown
        const localPos = currentShape.toLocal(event.global);

        // Use the same conversion as in onPointerDown for consistency
        const textureX = Math.floor((localPos.x / currentShape.scale.x) + currentShape.texture.width / 2);
        const textureY = Math.floor((localPos.y / currentShape.scale.y) + currentShape.texture.height / 2);

        // Find closest non-transparent pixel to the current position
        const closestPoint = this.findClosestShapePixel(currentShape, textureX, textureY, 40);
        if (!closestPoint){
            this._pointsContainer.removeChildren();
            return;
        }

        // If the found point is different from the last one
        if (closestPoint.x !== this._lastPoint.x || closestPoint.y !== this._lastPoint.y) {
            
            // Check for path crossing if we've drawn enough points
            if (this._pathPoints.length > this._safePathLength) {
                const willCrossPath = this.checkPathCrossing(currentShape, this._lastPoint, closestPoint);
                if (willCrossPath) {
                    this._isBurned = true;
                    console.log("Path crossed! Shape burned!");
                    this.triggerBurnAnimation();
                    return;
                }
            }
            
            // Fill points between last point and current point
            this.fillPointsBetween(currentShape, this._lastPoint.x, this._lastPoint.y, closestPoint.x, closestPoint.y);

            // Update last point
            this._lastPoint = new Point(closestPoint.x, closestPoint.y);

            // Check if shape is completed
            if (this._shapeProgress >= this._requiredCoverage && !this._isCompleted) {
                this._isCompleted = true;
                console.log("Shape completed!");
                this.triggerCompletionAnimation();
            }
        }
    };

    private onPointerUp = (): void => {
        this._isDrawing = false;
        this._lastPoint = null;
        this._pathPoints = [];
        this._drawnPixels.clear();
        this._pointsContainer.removeChildren(); // Clear points on release
        this._isBurned = false;

        // Don't clear points - leave them visible
    };

    // Fill points around a center point
    private fillPointsAround(shape: Shape, centerX: number, centerY: number, radius: number = 20): void {
        const positions = shape.getPositions;
        
        // Check and fill points in a square area around the center
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                const key = `${x},${y}`;
                
                // Check if this point is within the shape and not already drawn
                if (positions.has(key) && !this._drawnPixels.has(key)) {
                    // Distance from center (circular brush)
                    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    
                    if (distance <= radius) {
                        // Add to drawn pixels
                        this._drawnPixels.add(key);
                        
                        // Convert to world coordinates
                        const worldX = shape.x + ((x - shape.texture.width/2) * shape.scale.x);
                        const worldY = shape.y + ((y - shape.texture.height/2) * shape.scale.y);
                        
                        // Create a point graphic
                        this.createPointGraphic(worldX, worldY);
                        
                        // Add to path for tracking
                        this._pathPoints.push(new Point(worldX, worldY));
                    }
                }
            }
        }
        
        // Update progress
        this.updateShapeProgress(shape);
    }
    
    // Fill points between two points using Bresenham's line algorithm
    private fillPointsBetween(shape: Shape, x1: number, y1: number, x2: number, y2: number, radius: number = 20): void {
        // Calculate line points using Bresenham's algorithm
        const points = getLinePoints(x1, y1, x2, y2);
        
        // Fill around each point on the line
        for (const point of points) {
            this.fillPointsAround(shape, point.x, point.y, radius);
        }
    }
    

    
    // Create a point graphic at specified world coordinates
    private createPointGraphic(x: number, y: number): void {
        const pointGraphic = new Graphics();
        pointGraphic.circle(0, 0, this.POINT_RADIUS).fill(this._pointColor);
        pointGraphic.position.set(x, y);
        this._pointsContainer.addChild(pointGraphic);
    }

    // Calculate what percentage of the shape has been covered
    private updateShapeProgress(shape: Shape): void {
        const totalPixels = shape.getPositions.size;
        if (totalPixels === 0) return;
        this._shapeProgress = this._drawnPixels.size / totalPixels;
    }

    // Visual feedback for successfully completing the shape
    private triggerCompletionAnimation(): void {
        // Change color of all point graphics to green
        for (let i = 0; i < this._pointsContainer.children.length; i++) {
            const point = this._pointsContainer.children[i] as Graphics;
            point.clear();
            point.circle(0, 0,  this.POINT_RADIUS).fill(0x00FF00); // Change to green
        }
        
        // Emit an event that the game can listen for
        this.emit('shapeCompleted');
    }

    // Other methods remain the same...
    private findClosestShapePixel(shape: Shape, x: number, y: number, maxDistance: number = Infinity): Point | null {
        // Existing implementation...
        const positions = shape.getPositions;
        if (positions.size === 0) return null;

        // Check if the exact point exists
        const exactKey = `${x},${y}`;
        if (positions.has(exactKey)) {
            return new Point(x, y);
        }

        // If not, find the closest one
        let closestPoint: Point | null = null;
        let minDistance = Number.MAX_VALUE;

        // Convert positions to points
        for (const posStr of positions) {
            const [posX, posY] = posStr.split(',').map(Number);
            const distance = Math.sqrt(Math.pow(posX - x, 2) + Math.pow(posY - y, 2));

            if (distance < minDistance && distance <= maxDistance) {
                minDistance = distance;
                closestPoint = new Point(posX, posY);
            }
        }

        return closestPoint;
    }

    public nextShape(): void {
        if (this.currentShapeIndex < this._shapes.length - 1) {
            // Reset drawing state
            this._isDrawing = false;
            this._lastPoint = null;
            this._pathPoints = [];
            this._drawnPixels.clear();
            this._isBurned = false;
            this._isCompleted = false;
            this._shapeProgress = 0;
            
            // Clear all point graphics
            this._pointsContainer.removeChildren();
            
            // Switch to next shape
            this._shapes[this.currentShapeIndex].visible = false;
            this.currentShapeIndex++;
            this._shapes[this.currentShapeIndex].visible = true;
            this._requiredCoverage = SHAPES[this.currentShapeIndex].requiredCoverage;
        } else {
            // All shapes completed
            this.emit('allShapesCompleted');
        }
    }

    public isCurrentShapeCompleted(): boolean {
        return this._isCompleted;
    }

    public isCurrentShapeBurned(): boolean {
        return this._isBurned;
    }

    public getProgress(): number {
        return Math.min(1, this._shapeProgress / 100);
    }

    // Add this method to check for path crossings
    private checkPathCrossing(shape: Shape, fromPoint: Point, toPoint: Point): boolean {
        // Get all the points that will be drawn when moving from fromPoint to toPoint
        const testPoints = this.getPointsToFill(shape, fromPoint.x, fromPoint.y, toPoint.x, toPoint.y);
        
        // Keep track of how many overlapping points we've found
        let overlappingPoints = 0;
        
        // Get the set of recent points (as keys) to ignore
        const recentPoints = new Set<string>();
        const safeIndex = Math.max(0, this._pathPoints.length - this._safePathLength);
        
        for (let i = safeIndex; i < this._pathPoints.length; i++) {
            const point = this._pathPoints[i];
            const worldX = Math.round(point.x);
            const worldY = Math.round(point.y);
            recentPoints.add(`${worldX},${worldY}`);
        }
        
        // Check each point that would be filled
        for (const point of testPoints) {
            const key = `${point.x},${point.y}`;
            
            // If this point is already drawn AND it's not a recent point, count it
            if (this._drawnPixels.has(key)) {
                // Convert to world coordinates to check if it's a recent point
                const worldX = shape.x + ((point.x - shape.texture.width/2) * shape.scale.x);
                const worldY = shape.y + ((point.y - shape.texture.height/2) * shape.scale.y);
                const worldKey = `${Math.round(worldX)},${Math.round(worldY)}`;
                
                // Only count as overlap if it's not in our recent points
                if (!recentPoints.has(worldKey)) {
                    overlappingPoints++;
                    
                    // If we've found enough overlapping points, consider it a crossing
                    if (overlappingPoints >= this._burnThreshold) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // Add this helper method to simulate what points would be filled
    private getPointsToFill(shape: Shape, x1: number, y1: number, x2: number, y2: number, radius: number = 20): Set<Point> {
        const points = new Set<Point>();
        
        // Simulate filling along the line
        const linePoints = getLinePoints(x1, y1, x2, y2);
        
        for (const linePoint of linePoints) {
            // Simulate filling around each point on the line
            for (let y = linePoint.y - radius; y <= linePoint.y + radius; y++) {
                for (let x = linePoint.x - radius; x <= linePoint.x + radius; x++) {
                    const key = `${x},${y}`;
                    
                    // Check if this point is within the shape
                    if (shape.getPositions.has(key)) {
                        // Distance from center (circular brush)
                        const distance = Math.sqrt(Math.pow(x - linePoint.x, 2) + Math.pow(y - linePoint.y, 2));
                        
                        if (distance <= radius) {
                            points.add(new Point(x, y));
                        }
                    }
                }
            }
        }
        
        return points;
    }

    // Add this method to trigger the burn animation
    private triggerBurnAnimation(): void {
        // Change color of all point graphics to red
        for (let i = 0; i < this._pointsContainer.children.length; i++) {
            const point = this._pointsContainer.children[i] as Graphics;
            point.clear();
            point.circle(0, 0,  this.POINT_RADIUS).fill(0xFF0000); // Change to red
        }
        
        // Emit an event that the game can listen for
        this.emit('shapeBurned');
    }
}
