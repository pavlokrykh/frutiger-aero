import { Component, inject } from '@angular/core';
import { BubbleDirective } from '../../../../shared/elements/bubble/bubble.directive';
import { LiquidGlassService } from '../../../../shared/services/liquid-glass.service';

@Component({
  selector: 'app-liquid-toggle',
  standalone: true,
  imports: [BubbleDirective],
  templateUrl: './liquid-toggle.component.html',
  styleUrl: './liquid-toggle.component.scss',
})
export class LiquidToggleComponent {
  private readonly liquidGlassService = inject(LiquidGlassService);

  readonly enabled = this.liquidGlassService.enabled;

  toggleLiquidGlass(): void {
    this.liquidGlassService.toggle();
  }
}
