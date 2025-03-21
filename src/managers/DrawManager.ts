import { Container, FederatedPointerEvent, Graphics, Point, Sprite } from "pixi.js";
import { Shape } from "../components/Shape";
import { ShapeType } from "../types";
import { END_SHAPE_NUMBER, SHAPES, TARGET_SHAPE_NUMBER } from "../config";
import { getLinePoints } from "../core/utils/position";
import { EventEmitter } from "../core/events/EventEmitter";
import { ProgressBar } from "../components/ProgressBar";
import { AllShapesCompleted, OnGoEndShape, ShapeBurned, ShapeCompleted, ShapeWinAnimationComplete } from "../core/events/types";
import gsap from "gsap";

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

    private _progressBar: ProgressBar; // Reference to the progress bar

    private _isAutoDrawing: boolean = false;
    private _autoPlayHand!: Sprite; // Placeholder for the auto-play hand
    private _autoDrawPath: Point[] = [];
    private _autoDrawTween: gsap.core.Tween | null = null;
    private _autoBrushRadius: number = 20;
    private _lastAutoIndex: number = 0;
    private _autoPlayTimeout: any;

    private _deviceWidth: number;
    private _deviceHeight: number;
    private _baseWidth: number = 750; // Base width used during development
    private _baseHeight: number = 1334; // Base height used during development


    constructor(Shapes: ShapeType[] = [], progressBar: ProgressBar) {
        super();
        this._progressBar = progressBar;

        // Store the current device dimensions
        this._deviceWidth = window.innerWidth || document.documentElement.clientWidth;
        this._deviceHeight = window.innerHeight || document.documentElement.clientHeight;

        this.initDisplay();
        this.createShapes(Shapes);
        this.setupInteraction();
        this.initEvents();
        this.addChild(this._pointsContainer); // Add the points container
    }

    private initDisplay(): void {
        this._backround = Sprite.from('frame');
        this._backround.anchor.set(0.5);
        this._backround.label = 'DrawManagerBackground';
        this.addChild(this._backround);

    }
    private initEvents(): void {
        EventEmitter.instance.on(ShapeWinAnimationComplete, this.nextShape.bind(this));
        EventEmitter.instance.on(OnGoEndShape, this.goEndShape.bind(this));
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
        this.currentShapeIndex = 0;
        if (this._shapes.length > 0) {
            this._shapes[0].visible = true;
            this._requiredCoverage = SHAPES[this.currentShapeIndex].requiredCoverage;
        }
        this._autoPlayHand = Sprite.from('autoplayhand');
        this._autoPlayHand.visible = false;
        this._autoPlayHand.scale.set(0);
        this.addChild(this._autoPlayHand);
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
        // Stop auto-drawing if active
        if (this._isAutoDrawing) {
            this.stopAutoDrawAnimation();
        }

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
        if (!closestPoint) {
            this._pointsContainer.removeChildren();
            this._progressBar.animateProgress(0); // Reset progress bar
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
        this._progressBar.animateProgress(0); // Reset progress bar

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
                        const worldX = shape.x + ((x - shape.texture.width / 2) * shape.scale.x);
                        const worldY = shape.y + ((y - shape.texture.height / 2) * shape.scale.y);

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

    private fillPointsBetween(shape: Shape, x1: number, y1: number, x2: number, y2: number, radius: number = 20): void {
        // Calculate line points using Bresenham's algorithm
        const points = getLinePoints(x1, y1, x2, y2);

        // Fill around each point on the line
        for (const point of points) {
            this.fillPointsAround(shape, point.x, point.y, radius);
        }
        this._progressBar.animateProgress(this._shapeProgress); // Update progress bar
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
        // this._progressBar.progress = this._shapeProgress; // Update progress bar
    }

    private triggerCompletionAnimation(): void {
        // Change color of all point graphics to green
        for (let i = 0; i < this._pointsContainer.children.length; i++) {
            const point = this._pointsContainer.children[i] as Graphics;
            point.clear();
            point.circle(0, 0, this.POINT_RADIUS).fill(0x00FF00); // Change to green
        }
        EventEmitter.instance.emit(ShapeCompleted);
        this._isDrawing = false; // Stop drawing
    }

    private findClosestShapePixel(shape: Shape, x: number, y: number, maxDistance: number = Infinity): Point | null {
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

    private nextShape(): void {
        if (this.currentShapeIndex < TARGET_SHAPE_NUMBER - 1) {
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
            EventEmitter.instance.emit(AllShapesCompleted);
        }
    }
    private goEndShape(): void {
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
            this._shapes[this.currentShapeIndex].visible = false;
            this.currentShapeIndex = END_SHAPE_NUMBER - 1; // Set to the end shape index
            this._shapes[this.currentShapeIndex].visible = true;
            this._requiredCoverage = SHAPES[this.currentShapeIndex].requiredCoverage;
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
                const worldX = shape.x + ((point.x - shape.texture.width / 2) * shape.scale.x);
                const worldY = shape.y + ((point.y - shape.texture.height / 2) * shape.scale.y);
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
            point.circle(0, 0, this.POINT_RADIUS).fill(0xFF0000); // Change to red
        }
        // Emit an event that the game can listen for
        EventEmitter.instance.emit(ShapeBurned);
        // this.onPointerUp(); // Call pointer up to reset state
        this._isDrawing = false;
    }


    public startAutoDrawAnimation(): void {
        // Stop any existing auto-draw
        this.stopAutoDrawAnimation();

        const currentShape = this._shapes[this.currentShapeIndex];
        if (!currentShape) return;

        // Scale the stored positions to the current device
        const startPosConfig = SHAPES[this.currentShapeIndex].handStartPosition;
        const endPosConfig = SHAPES[this.currentShapeIndex].handEndPosition;

        // Convert to current device coordinates
        const startPos = this.scalePositionToDevice(startPosConfig.x, startPosConfig.y);
        const endPos = this.scalePositionToDevice(endPosConfig.x, endPosConfig.y);

        // Reset drawing state
        this._pathPoints = [];
        this._pointsContainer.removeChildren();
        this._drawnPixels = new Set<string>();
        this._isBurned = false;
        this._isCompleted = false;
        this._shapeProgress = 0;

        // Convert scaled global positions to shape's texture coordinates
        const startLocal = this.toLocal(startPos);
        const startTextureX = SHAPES[this.currentShapeIndex].autoPlayStartPosition.x;
        const startTextureY = SHAPES[this.currentShapeIndex].autoPlayStartPosition.y;

        // Find closest valid starting point
        const startPoint = this.findClosestShapePixel(currentShape, startTextureX, startTextureY, 40);
        if (!startPoint) {
            console.error("Auto-draw: Could not find valid starting point");
            return;
        }

        // Convert global end position to texture coordinates
        const endLocal = currentShape.toLocal(new Point(endPos.x, endPos.y));
        const endTextureX = SHAPES[this.currentShapeIndex].autoPlayEndPosition.x;
        const endTextureY = SHAPES[this.currentShapeIndex].autoPlayEndPosition.y;

        // Find closest valid ending point
        const endPoint = this.findClosestShapePixel(currentShape, endTextureX, endTextureY, 40);
        if (!endPoint) {
            console.error("Auto-draw: Could not find valid ending point");
            return;
        }

        // Generate path
        this._autoDrawPath = this.generateAutoDrawPath(currentShape, startPoint, endPoint);

        // Set initial state
        this._isDrawing = true;
        this._isAutoDrawing = true;
        this._lastPoint = startPoint;
        this._lastAutoIndex = 0;

        // Start with first point
        this.fillPointsAround(currentShape, startPoint.x, startPoint.y, this._autoBrushRadius);

        // Animation progress value
        const progress = { value: 0 };

        gsap.fromTo(this._autoPlayHand, { x: startLocal.x, y: startLocal.y }, {
            x: endLocal.x, y: endLocal.y, duration: 1, ease: "linear",
            onStart: () => {
                this._autoPlayHand.visible = true;
                gsap.to(this._autoPlayHand.scale, {
                    x: 1, y: 1, duration: 0.5, ease: "back.out(1.7)"
                });
            },
            onComplete: () => {
                gsap.to(this._autoPlayHand.scale, {
                    x: 0, y: 0, duration: 0.5, ease: "back.in(1.7)",
                    onComplete: () => {
                        this._autoPlayHand.visible = false;
                    }
                });
            }
        });

        // Create GSAP animation
        this._autoDrawTween = gsap.to(progress, {
            value: 1,
            duration: 1,
            ease: "linear", // Can be changed to other easing functions
            onUpdate: () => {
                // Calculate current index in the path based on progress
                const targetIndex = Math.min(
                    this._autoDrawPath.length - 1,
                    Math.floor(progress.value * this._autoDrawPath.length)
                );

                // Draw all points from last index to current index
                this.drawPathSegment(currentShape, this._lastAutoIndex, targetIndex);
                this._lastAutoIndex = targetIndex;
            },
            onComplete: () => {
                // Make sure we draw the final segment
                this.drawPathSegment(currentShape, this._lastAutoIndex, this._autoDrawPath.length - 1);
                this._isAutoDrawing = false;
                this._isDrawing = false;

                this._autoPlayTimeout = window.setTimeout(() => {
                    this.onPointerUp(); // Call pointer up to reset state
                    this.startAutoDrawAnimation(); // Restart auto-draw
                }, 5000);

            }
        });
    }

    /**
     * Draw a segment of the auto-draw path
     */
    private drawPathSegment(shape: Shape, fromIndex: number, toIndex: number): void {
        if (!this._lastPoint) return;
        // Draw each point in sequence
        for (let i = fromIndex; i <= toIndex; i++) {
            const point = this._autoDrawPath[i];
            // Skip if same as last point
            if (point.x === this._lastPoint.x && point.y === this._lastPoint.y) continue;
            // Fill points between last point and current point
            this.fillPointsBetween(shape, this._lastPoint.x, this._lastPoint.y, point.x, point.y, this._autoBrushRadius);
            // Update last point
            this._lastPoint = new Point(point.x, point.y);
        }
    }

    /**
     * Generate a path between two points that follows the shape
     */
    private generateAutoDrawPath(shape: Shape, startPoint: Point, endPoint: Point): Point[] {
        // Get basic line between points
        const basicPath = getLinePoints(startPoint.x, startPoint.y, endPoint.x, endPoint.y);

        // Filter points to ensure they're all valid shape points
        const validPath: Point[] = [];

        // Add start point
        validPath.push(startPoint);

        // Process each point in the basic path, ensuring we stay on the shape
        for (let i = 1; i < basicPath.length - 1; i += 5) { // Sample every 5th point for smoother path
            const point = basicPath[i];

            // Find closest valid point on the shape
            const validPoint = this.findClosestShapePixel(shape, point.x, point.y, 30);

            if (validPoint) {
                validPath.push(validPoint);
            }
        }

        // Add end point
        validPath.push(endPoint);

        // Make path more natural by adding slight variations
        return this.smoothPath(validPath);
    }

    /**
     * Add slight variations to make path look more natural
     */
    private smoothPath(path: Point[]): Point[] {
        // If path is too short, return as is
        if (path.length < 3) return path;

        const smoothed: Point[] = [];
        smoothed.push(path[0]); // Keep start point

        // Process middle points
        for (let i = 1; i < path.length - 1; i++) {
            const curr = path[i];
            const next = path[i + 1];

            // Add current point
            smoothed.push(curr);

            // Add intermediate points with slight variation
            if (i < path.length - 2) {
                // Calculate direction vector
                const dx = next.x - curr.x;
                const dy = next.y - curr.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Only add intermediate points if points are far enough apart
                if (dist > 20) {
                    // Add a point halfway between with slight random variation
                    smoothed.push(new Point(
                        curr.x + dx * 0.5 + (Math.random() * 6 - 3),
                        curr.y + dy * 0.5 + (Math.random() * 6 - 3)
                    ));
                }
            }
        }

        smoothed.push(path[path.length - 1]); // Keep end point
        return smoothed;
    }

    /**
     * Stop any active auto-drawing animation
     */
    public stopAutoDrawAnimation(): void {
        if (this._autoDrawTween) {
            this._autoDrawTween.kill();
            this._autoDrawTween = null;
        }
        window.clearTimeout(this._autoPlayTimeout);
        this._isAutoDrawing = false;
        this._autoDrawPath = [];
        this._autoPlayHand.visible = false;
        this._autoPlayHand.scale.set(0);
    }

    // Add this helper method to convert stored positions to current device positions
    private scalePositionToDevice(storedX: number, storedY: number): Point {
        // Convert the stored coordinates to relative percentages of the base dimensions
        const relativeX = storedX / this._baseWidth;
        const relativeY = storedY / this._baseHeight;

        // Convert relative coordinates to the current device dimensions
        const deviceX = relativeX * this._deviceWidth;
        const deviceY = relativeY * this._deviceHeight;

        return new Point(deviceX, deviceY);
    }

}
