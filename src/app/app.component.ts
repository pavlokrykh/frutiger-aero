import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from './shared/menu/menu.component';
import { DebugToggleComponent } from './layout/debug-toggle/debug-toggle.component';
import { AudioService } from './shared/services/audio.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuComponent, DebugToggleComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private audioService = inject(AudioService);

  protected readonly title = signal('frutiger-aero');

  ngOnInit(): void {
    this.audioService.startLooping();
  }
}
