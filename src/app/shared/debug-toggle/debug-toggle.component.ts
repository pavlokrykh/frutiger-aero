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
  private readonly isAltBackground = signal(false);

  private readonly documentRef = inject(DOCUMENT);

  toggleBackground(): void {
    const next = !this.isAltBackground();
    this.isAltBackground.set(next);
    const body = this.documentRef.body;
    if (next) {
      body.classList.add('alt-bg');
    } else {
      body.classList.remove('alt-bg');
    }
  }
}
