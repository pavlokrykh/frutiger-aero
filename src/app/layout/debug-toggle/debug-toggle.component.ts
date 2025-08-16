import { Component } from '@angular/core';
import { BgToggleComponent } from './components/bg-toggle/bg-toggle.component';
import { LiquidToggleComponent } from './components/liquid-toggle/liquid-toggle.component';

@Component({
  selector: 'app-debug-toggle',
  standalone: true,
  imports: [BgToggleComponent, LiquidToggleComponent],
  templateUrl: './debug-toggle.component.html',
  styleUrl: './debug-toggle.component.scss',
})
export class DebugToggleComponent {}
