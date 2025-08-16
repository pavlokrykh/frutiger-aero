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

  // Bubble pop sound configuration
  private readonly popSounds: readonly string[] = [
    'assets/audio/bubbles/pop/bubble-pop-03-320977.mp3',
    'assets/audio/bubbles/pop/bubble-pop-06-351337.mp3',
    'assets/audio/bubbles/pop/bubble-pop-389501.mp3',
    'assets/audio/bubbles/pop/bubblepop-01-255624.mp3',
  ];
  private readonly extraSounds: readonly string[] = [
    'assets/audio/bubbles/extra/part-0.mp3',
    'assets/audio/bubbles/extra/part-1.mp3',
    'assets/audio/bubbles/extra/part-2.mp3',
    'assets/audio/bubbles/extra/part-3.mp3',
    'assets/audio/bubbles/extra/part-4.mp3',
    'assets/audio/bubbles/extra/part-5.mp3',
  ];
  private readonly popVolume = 0.3; // 30% volume for pop sounds

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

  /**
   * Play a random bubble pop sound
   */
  playBubblePop(): void {
    const randomIndex = Math.floor(Math.random() * this.popSounds.length);
    const soundPath = this.popSounds[randomIndex];
    this.playSound(soundPath, this.popVolume);
  }

  /**
   * Play a random extra sound (for nav bubbles sliding out)
   */
  playExtraSound(): void {
    const randomIndex = Math.floor(Math.random() * this.extraSounds.length);
    const soundPath = this.extraSounds[randomIndex];
    this.playSound(soundPath, this.popVolume);
  }

  /**
   * Play bubble pop sound with delay for menu extra sound effect
   */
  playMenuBubbleSequence(): void {
    // First play the random pop sound immediately
    this.playBubblePop();

    // Then play the extra sound when nav bubbles slide out (shorter delay)
    // Play sound right when bubbles start sliding out
    setTimeout(() => {
      this.playExtraSound();
    }, 200); // Much shorter timing to play when bubbles start sliding
  }

  /**
   * Play a sound effect at the specified volume
   */
  private playSound(soundPath: string, volume: number): void {
    try {
      const audio = new Audio(soundPath);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.preload = 'auto';

      audio.play().catch((error) => {
        console.warn('Could not play sound:', soundPath, error);
      });
    } catch (error) {
      console.warn('Error creating audio for:', soundPath, error);
    }
  }
}
