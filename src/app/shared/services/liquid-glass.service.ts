import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LiquidGlassService {
  private readonly _enabled = signal(this.getInitialState());

  readonly enabled = this._enabled.asReadonly();

  private getInitialState(): boolean {
    // Disable by default on mobile browsers
    if (this.isMobileBrowser()) {
      return false;
    }

    // Check for saved preference
    try {
      const saved = localStorage.getItem('liquid-glass-enabled');
      return saved ? JSON.parse(saved) : true;
    } catch {
      // If localStorage is not available or fails, default to true for desktop
      return true;
    }
  }

  private isMobileBrowser(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined')
      return false;

    // Check for touch capability and screen size
    const hasTouchScreen =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    // Check user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'android',
      'webos',
      'iphone',
      'ipad',
      'ipod',
      'blackberry',
      'windows phone',
      'mobile',
    ];
    const isMobileUA = mobileKeywords.some((keyword) =>
      userAgent.includes(keyword),
    );

    // Consider it mobile if it has touch AND (small screen OR mobile user agent)
    return hasTouchScreen && (isSmallScreen || isMobileUA);
  }

  toggle(): void {
    const newState = !this._enabled();
    this._enabled.set(newState);
    this.saveState(newState);
  }

  enable(): void {
    this._enabled.set(true);
    this.saveState(true);
  }

  disable(): void {
    this._enabled.set(false);
    this.saveState(false);
  }

  private saveState(state: boolean): void {
    try {
      localStorage.setItem('liquid-glass-enabled', JSON.stringify(state));
    } catch {
      // Ignore localStorage errors (e.g., in private browsing mode)
    }
  }
}
