export interface SoundConfig {
    alias: string;
    url: string;
    soundChannel: SoundChannel;
}
export enum SoundChannel{
    MUSIC = "music",
    EFFECT = "effect"
}

