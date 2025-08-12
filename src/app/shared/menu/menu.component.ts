import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BubbleDirective } from '../elements/bubble/bubble.directive';

@Component({
  selector: 'app-menu',
  imports: [RouterLink, RouterLinkActive, BubbleDirective],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  readonly isOpen = signal(false);
  // Larger nav bubbles
  readonly sizes = [84, 96, 108];

  toggleMenu() {
    this.isOpen.update((prev) => !prev);
  }
}
