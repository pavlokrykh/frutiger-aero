import { Component } from '@angular/core';
import { BubbleDirective } from '../../shared/elements/bubble/bubble.directive';

@Component({
  selector: 'app-about',
  imports: [BubbleDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {}
