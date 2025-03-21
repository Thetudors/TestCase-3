import { ShapeType } from "./types";

export const SHAPES: ShapeType[] = [
    {
        name: "bottle", requiredCoverage: 0.95,
        autoPlayStartPosition: { x: 174.5, y: 303 },
        autoPlayEndPosition: { x: 237.5, y: 304 }
    },
    {
        name: "high_heels", requiredCoverage: 0.7,
        autoPlayStartPosition: { x: 0.3, y: 0.3 },
        autoPlayEndPosition: { x: 0.3, y: 0.3 }
    },
    {
        name: "ship", requiredCoverage: 0.65,
        autoPlayStartPosition: { x: 0.4, y: 0.4 },
        autoPlayEndPosition: { x: 0.4, y: 0.4 }
    },
    {
        name: "table_lamp", requiredCoverage: 0.75,
        autoPlayStartPosition: { x: 0.6, y: 0.6 },
        autoPlayEndPosition: { x: 0.6, y: 0.6 }
    }
];
