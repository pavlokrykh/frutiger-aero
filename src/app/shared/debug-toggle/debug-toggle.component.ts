import { Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BubbleDirective } from '../elements/bubble/bubble.directive';

@Component({
  selector: 'app-debug-toggle',
  standalone: true,
  imports: [BubbleDirective],
  templateUrl: './debug-toggle.component.html',
  styleUrl: './debug-toggle.component.scss',
})
export class DebugToggleComponent {
  private readonly currentBgIndex = signal(1); // Start at index 1 to match initial bg2.webp

  private readonly backgrounds = [
    './assets/images/bg.jpg',
    // './assets/images/bg2.webp',
    './assets/images/bg3.jpg',
    './assets/images/bg4.jpg',
    './assets/images/bg5.png',
    './assets/images/bg6.png',
  ];

  private readonly documentRef = inject(DOCUMENT);

  toggleBackground(): void {
    const nextIndex = (this.currentBgIndex() + 1) % this.backgrounds.length;
    this.currentBgIndex.set(nextIndex);

    const body = this.documentRef.body;
    // Remove any existing background classes
    body.classList.remove('alt-bg', 'bg-2', 'bg-3', 'bg-4');

    // Set the new background
    body.style.backgroundImage = `url('${this.backgrounds[nextIndex]}')`;
  }
}
