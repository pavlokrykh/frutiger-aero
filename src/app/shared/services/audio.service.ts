import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private fadeInterval: number | null = null;
  private playbackTimeout: number | null = null;
  private isPlaying = false;
  private fadeDuration = 5 * 1000; // 4 second fade for better effect
  private intervalDuration = 5 * 1000; // 10 second interval
  private targetVolume = 0.1; // 10% volume
  private hasFadedOut = false; // Track if we've already started fade out

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio(): void {
    this.audio = new Audio('assets/audio/Echoes of Tomorrow ext v2.2.mp3');
    this.audio.preload = 'auto';
    this.audio.volume = 0; // Start at 0 volume

    // Set up event listeners
    this.audio.addEventListener('timeupdate', () => {
      this.checkForFadeOut();
    });

    this.audio.addEventListener('ended', () => {
      if (this.isPlaying) {
        this.scheduleNext();
      }
    });

    this.audio.addEventListener('canplaythrough', () => {
      console.log('Audio loaded and ready to play');
    });
  }

  startLooping(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playWithFadeIn();
  }

  stopLooping(): void {
    this.isPlaying = false;

    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }

    if (this.audio && !this.audio.paused) {
      this.fadeOut(() => {
        this.audio!.pause();
        this.audio!.currentTime = 0;
      });
    }
  }

  private playWithFadeIn(): void {
    if (!this.audio || !this.isPlaying) return;

    this.audio.volume = 0;
    this.audio.currentTime = 0;
    this.hasFadedOut = false; // Reset fade out flag

    this.audio
      .play()
      .then(() => {
        this.fadeIn();
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        // Retry after a short delay if autoplay is blocked
        setTimeout(() => {
          if (this.isPlaying) {
            this.playWithFadeIn();
          }
        }, 1000);
      });
  }

  private fadeIn(): void {
    if (!this.audio) return;

    const steps = 40; // More steps for smoother fade
    const volumeStep = this.targetVolume / steps;
    const timeStep = this.fadeDuration / steps;
    let currentStep = 0;

    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    this.fadeInterval = setInterval(() => {
      if (!this.audio || !this.isPlaying) {
        if (this.fadeInterval !== null) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        return;
      }

      currentStep++;
      this.audio.volume = Math.min(currentStep * volumeStep, this.targetVolume);

      if (currentStep >= steps) {
        if (this.fadeInterval !== null) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        this.audio.volume = this.targetVolume;
      }
    }, timeStep);
  }

  private fadeOut(callback?: () => void): void {
    if (!this.audio) return;

    const steps = 40; // More steps for smoother fade
    const volumeStep = this.audio.volume / steps;
    const timeStep = this.fadeDuration / steps;
    let currentStep = 0;

    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        if (this.fadeInterval !== null) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        return;
      }

      currentStep++;
      this.audio.volume = Math.max(this.audio.volume - volumeStep, 0);

      if (currentStep >= steps || this.audio.volume <= 0) {
        if (this.fadeInterval !== null) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        this.audio.volume = 0;
        if (callback) callback();
      }
    }, timeStep);
  }

  private checkForFadeOut(): void {
    if (!this.audio || !this.isPlaying || this.hasFadedOut) return;

    const currentTime = this.audio.currentTime;
    const duration = this.audio.duration;

    // Start fade out when we're within fade duration seconds of the end
    if (duration && currentTime >= duration - this.fadeDuration / 1000) {
      this.hasFadedOut = true;
      this.fadeOut();
    }
  }

  private scheduleNext(): void {
    if (!this.isPlaying) return;

    // Schedule next play after the interval
    this.playbackTimeout = setTimeout(() => {
      if (this.isPlaying) {
        this.playWithFadeIn();
      }
    }, this.intervalDuration);
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  setVolume(volume: number): void {
    const newVolume = Math.max(0, Math.min(1, volume));
    this.targetVolume = newVolume;
    if (this.audio) {
      this.audio.volume = newVolume;
    }
  }
}
