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

  // Autoplay handling: when browser blocks autoplay, we wait for a user gesture
  private pendingAutoplay = false;
  private userInteracted = false;
  private boundUserGestureHandler: (() => void) | null = null;

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

    // Track whether the user has interacted with the page yet (one-time)
    const markInteracted = () => {
      this.userInteracted = true;
      document.removeEventListener(
        'pointerdown',
        markInteracted as EventListener,
      );
      document.removeEventListener('keydown', markInteracted as EventListener);
      document.removeEventListener(
        'touchstart',
        markInteracted as EventListener,
      );
    };

    document.addEventListener('pointerdown', markInteracted, { once: true });
    document.addEventListener('keydown', markInteracted, { once: true });
    document.addEventListener('touchstart', markInteracted, { once: true });
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

  private attachUserGestureListener() {
    if (this.boundUserGestureHandler) return;
    this.boundUserGestureHandler = () => {
      // Any user gesture should attempt to start playback once
      this.detachUserGestureListener();
      if (this.isPlaying) {
        // Try playing again now that a gesture occurred
        this.playWithFadeIn();
      }
    };

    // Listen for common first-interaction events (one-time handlers)
    document.addEventListener('pointerdown', this.boundUserGestureHandler, {
      once: true,
    });
    document.addEventListener('keydown', this.boundUserGestureHandler, {
      once: true,
    });
    document.addEventListener('touchstart', this.boundUserGestureHandler, {
      once: true,
    });
  }

  private detachUserGestureListener() {
    if (!this.boundUserGestureHandler) return;
    document.removeEventListener(
      'pointerdown',
      this.boundUserGestureHandler as EventListener,
    );
    document.removeEventListener(
      'keydown',
      this.boundUserGestureHandler as EventListener,
    );
    document.removeEventListener(
      'touchstart',
      this.boundUserGestureHandler as EventListener,
    );
    this.boundUserGestureHandler = null;
    this.pendingAutoplay = false;
  }

  startLooping(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;

    // If the user already interacted, attempt to play immediately, otherwise
    // wait for a user gesture to avoid autoplay blocking errors and console spam.
    if (this.userInteracted) {
      this.playWithFadeIn();
    } else {
      this.pendingAutoplay = true;
      this.attachUserGestureListener();
    }
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
        // Modern browsers block autoplay without a user interaction (NotAllowedError).
        // Instead of retrying in a tight loop, register a one-time user gesture
        // listener and try again when the user interacts.
        const msg = String(error && (error.message || error));
        const isNotAllowed =
          Boolean(error && error.name === 'NotAllowedError') ||
          /didn't interact|NotAllowedError|Interaction|user gesture|play\(\) failed/i.test(
            msg,
          );

        if (isNotAllowed) {
          console.warn(
            'Autoplay blocked by browser — will start audio on first user interaction.',
          );
          this.pendingAutoplay = true;
          this.attachUserGestureListener();
        } else {
          console.error('Error playing audio:', error);
        }
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
