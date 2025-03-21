import { GameSize, spriteConfig } from "./types";

export const PORTRAITSIZE: GameSize = { width: 480, height: 800 };
export const LANDSCAPESIZE: GameSize = { width: 1920, height: 1080 };
export const SAFESIZE: GameSize = { width: 800, height: 600 };


export const SPRITES: spriteConfig[] = [
    { alias: "mainscenebackground", src: "./assets/sprites/background.jpg" },
    { alias: "ship", src: "./assets/sprites/shapes/ship.png" },
    { alias: "bottle", src: "./assets/sprites/shapes/bottle.png" },
    { alias: "high_heels", src: "./assets/sprites/shapes/high_heels.png" },
    { alias: "table_lamp", src: "./assets/sprites/shapes/table_lamp.png" },
    { alias: "frame", src: "./assets/sprites/frame.png" },
    { alias: "buttonbg", src: "./assets/sprites/fail_bg.png" },
    { alias: "progressbarbg", src: "./assets/sprites/progressbar_bg.png" },
    { alias: "progressbarfill", src: "./assets/sprites/progressbar_fill.png" },
    { alias: "icon", src: "./assets/sprites/brain_icon.png" },
    { alias: "autoplayhand", src: "./assets/sprites/hand.png" },
    { alias: "rect", src: "./assets/sprites/rect.png" },
    { alias: "failimage", src: "./assets/sprites/fail_bg.png" },
    { alias: "welldoneimage", src: "./assets/sprites/well_done_bg.png" },
    { alias: "downloadbutton", src: "./assets/sprites/download_button.png" },
]

export const FONTS: FontFace[] = [
    new FontFace('sniglet-regular', 'url(./assets/fonts/Sniglet-Regular.ttf)')
];