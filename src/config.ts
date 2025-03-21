import { ShapeType } from "./types";

export const TARGET_SHAPE_NUMBER = 3;
export const END_SHAPE_NUMBER = 4;

export const SHAPES: ShapeType[] = [
    {
        name: "bottle", requiredCoverage: 0.985,
        autoPlayStartPosition: { x: 118, y: 185 },
        autoPlayEndPosition: { x: 250, y: 185 },
        handStartPosition: { x: 429, y: 616 },
        handEndPosition: { x: 594, y: 621 },
    },
    {
        name: "table_lamp", requiredCoverage: 0.985,
        autoPlayStartPosition: { x: 92, y: 204 },
        autoPlayEndPosition: { x: 17, y: 204 },
        handStartPosition: { x: 387, y: 648 },
        handEndPosition: { x: 287, y: 648 },
    },
    {
        name: "ship", requiredCoverage: 0.985,
        autoPlayStartPosition: { x: 142, y: 113 },
        autoPlayEndPosition: { x: 56, y: 111 },
        handStartPosition: { x: 419, y: 574 },
        handEndPosition: { x: 298, y: 567 },
    },
    {
        name: "high_heels", requiredCoverage: 0.985,
        autoPlayStartPosition: { x: 424, y: 271 },
        autoPlayEndPosition: { x: 424, y: 418 },
        handStartPosition: { x: 679, y: 725 },
        handEndPosition: { x: 679, y: 885 },
    },
];
