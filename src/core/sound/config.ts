import { SoundChannel, SoundConfig } from "./types";

export const SOUNDS : SoundConfig[] = [
    {
        alias: "lose",
        url: "./assets/sounds/effect_lose.mp3",
        soundChannel: SoundChannel.EFFECT,
    },
    {
        alias: "confetti",
        url: "./assets/sounds/effect_confetti.mp3",
        soundChannel: SoundChannel.EFFECT,
    },
    {
        alias: "theme",
        url: "./assets/sounds/theme_main.mp3",
        soundChannel: SoundChannel.MUSIC,
    }
]