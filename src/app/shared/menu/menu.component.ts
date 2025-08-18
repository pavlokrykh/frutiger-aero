import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BubbleDirective } from '../elements/bubble/bubble.directive';
import { AudioService } from '../services/audio.service';

@Component({
  selector: 'app-menu',
  imports: [RouterLink, RouterLinkActive, BubbleDirective],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  private readonly audioService = inject(AudioService);

  readonly isOpen = signal(false);
  // Larger nav bubbles
  readonly sizes = [84, 96, 108, 92];

  toggleMenu(): void {
    const wasOpen = this.isOpen();

    // When opening menu, play the sequence (pop + bubbles sound)
    // When closing, just play a regular pop sound
    if (!wasOpen) {
      this.audioService.playMenuBubbleSequence();
    } else {
      this.audioService.playBubblePop();
    }

    this.isOpen.update((prev) => !prev);
  }
}
