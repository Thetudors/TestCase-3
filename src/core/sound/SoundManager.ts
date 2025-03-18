import { sound } from '@pixi/sound';
import { SoundChannel, SoundConfig } from './types';

export class SoundManager {
    private static _instance: SoundManager;
    private _soundChannels: { [key: string]: SoundChannel } = {};
    private _loaded: boolean = false;

    public static get instance(): SoundManager {
        if (!SoundManager._instance) {
            SoundManager._instance = new SoundManager();
        }
        return SoundManager._instance;
    }

    public async loadSounds(soundList: SoundConfig[]): Promise<void> {
        if (this._loaded)
            return;

        for (const soundData of soundList) {
            sound.add(soundData.alias, soundData.url);
            this._soundChannels[soundData.alias] = soundData.soundChannel;
        }
        this._loaded = true;
    }

    public playSound(alias: string, options?: { loop?: boolean; volume?: number }): void {
        if (sound.exists(alias)) {
            sound.play(alias, options);
        } else {
            console.warn(`Sound with alias "${alias}" not found.`);
        }
    }

    public stopSound(alias: string): void {
        if (sound.exists(alias)) {
            sound.stop(alias);
        } else {
            console.warn(`Sound with alias "${alias}" not found.`);
        }
    }

    public setVolume(alias: string, volume: number): void {
        if (sound.exists(alias)) {
            const soundInstance = sound.find(alias);
            if (soundInstance) {
                soundInstance.volume = volume;
            }
        } else {
            console.warn(`Sound with alias "${alias}" not found.`);
        }
    }

    public getSoundChannel(alias: string): SoundChannel | undefined {
        return this._soundChannels[alias];
    }

    private setChannelMuted(channel: SoundChannel, isMuted: boolean): void {
        for (const [alias, soundChannel] of Object.entries(this._soundChannels)) {
            if (soundChannel === channel) {
                const soundInstance = sound.find(alias);
                if (soundInstance) {
                    soundInstance.muted = isMuted;
                }
            }
        }
    }

    public setChannelVolume(channel: SoundChannel, volume: number): void {
        for (const [alias, soundChannel] of Object.entries(this._soundChannels)) {
            if (soundChannel === channel) {
                const soundInstance = sound.find(alias);
                if (soundInstance) {
                    soundInstance.volume = volume;
                }
            }
        }
    }

    public muteMusic(): void {
        this.setChannelMuted(SoundChannel.MUSIC, true);
    }

    public unmuteMusic(): void {
        this.setChannelMuted(SoundChannel.MUSIC, false);
    }

    public muteEffects(): void {
        this.setChannelMuted(SoundChannel.EFFECT, true);
    }

    public unmuteEffects(): void {
        this.setChannelMuted(SoundChannel.EFFECT, false);
    }

    public muteAll(): void {
        this.muteMusic();
        this.muteEffects();
    }


}