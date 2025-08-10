import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';

@Directive({
  selector: '[bubble]',
  standalone: true,
  host: {
    class: 'bubble',
  },
})
export class BubbleDirective implements OnInit, OnDestroy {
  private floating = false;
  private expanded = false;
  private index = 0;
  private count = 1;

  // Base target position when expanded (randomized per bubble)
  private baseX = 0;
  private baseY = 0;
  // Entry start position (off-screen left)
  private entryStartX = 0;
  private entryStartY = 0;

  // Idle drift configuration (subtle but noticeable)
  private driftAmplitudeX = 4 + Math.random() * 4; // px
  private driftAmplitudeY = 4 + Math.random() * 4; // px
  private driftSpeedX = 0.05 + Math.random() * 0.08; // cycles/sec
  private driftSpeedY = 0.05 + Math.random() * 0.08; // cycles/sec
  private wobbleSpeed = 0.015 + Math.random() * 0.035; // cycles/sec
  private wobbleAmplitudeDeg = 1.2 + Math.random() * 0.9; // deg
  private phaseOffsetX = Math.random() * Math.PI * 2;
  private phaseOffsetY = Math.random() * Math.PI * 2;
  private tetherRadius = 16 + Math.random() * 8; // px, clamp around base

  // Interaction state
  private isHovering = false;
  private hoverOffsetX = 0;
  private hoverOffsetY = 0;
  private currentScale = 1;
  private targetScale = 1;

  // Open/close animation progress 0..1
  private openProgress = 0;
  private openAnimStartTs = 0;
  private openAnimDurationMs = 900 + Math.random() * 300; // faster open/close
  private openStartProgress = 0;
  private openDelayMs = Math.random() * 120; // smaller stagger

  private rafId: number | null = null;
  private startTs = performance.now();

  @HostBinding('attr.data-bubble') dataAttr = 'true';

  private readonly el = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private containerEl: HTMLElement | null = null;
  private containerW = 240;
  private containerH = 220;
  private containerLeft = 0;

  ngOnInit(): void {
    // Ensure GPU-friendly transform updates
    const el = this.el.nativeElement;
    el.style.willChange = 'transform';
    el.style.transform = 'translate3d(0,0,0)';
    el.style.pointerEvents = 'none';

    // Cache container and its size
    this.containerEl =
      (el.closest('.nav-menu') as HTMLElement) ?? el.parentElement;
    this.updateContainerSize();

    // Randomize base target position within a soft radius, creating a chaotic cluster
    this.planLayout();

    // Kick off RAF outside Angular to keep change detection calm
    this.zone.runOutsideAngular(() => {
      const loop = (ts: number) => {
        this.updateFrame(ts);
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  @Input()
  set bubbleExpanded(value: boolean) {
    const changed = value !== this.expanded;
    this.expanded = value;
    if (!this.floating) return; // only nav bubbles animate open/close
    if (changed) {
      this.openStartProgress = this.openProgress;
      this.openAnimStartTs = performance.now();
    }
  }

  @Input()
  set bubbleFloating(value: boolean) {
    this.floating = value;
    this.planLayout();
  }

  @Input()
  set bubbleIndex(value: number) {
    this.index = Number.isFinite(value) ? value : 0;
    this.planLayout();
  }

  @Input()
  set bubbleCount(value: number) {
    this.count = value && value > 0 ? value : 1;
    this.planLayout();
  }

  private planLayout() {
    if (!this.floating) return;
    this.updateContainerSize();
    // Compute a near-vertical line below the toggle
    const jitterX = (Math.random() - 0.5) * 12; // slight horizontal chaos
    const jitterY = (Math.random() - 0.5) * 10; // slight vertical chaos
    const spacing = 56 + Math.random() * 8; // vertical spacing
    // Read toggle size and anchor bubbles below it
    const hostRect = this.containerEl?.getBoundingClientRect();
    const toggleEl = this.containerEl
      ?.previousElementSibling as HTMLElement | null;
    const toggleRect = toggleEl?.getBoundingClientRect();
    const baseLeft =
      toggleRect && hostRect ? toggleRect.left - hostRect.left : 0;
    const baseTop = toggleRect && hostRect ? toggleRect.top - hostRect.top : 0;
    const anchorX = baseLeft + (toggleRect?.width ?? 48) * 0.5;
    const anchorY = baseTop + (toggleRect?.height ?? 48) + 18; // small gap
    const startX = Math.min(this.containerW - 40, Math.max(40, anchorX));
    const startY = Math.min(this.containerH - 40, Math.max(40, anchorY));

    this.baseX = startX + jitterX;
    this.baseY = startY + this.index * spacing + jitterY;

    // Start off-screen left (relative to container) for fly-in/out
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
    // Place well outside the left edge of the viewport so it's never visible when closed
    const offscreen = -vw - 480 - Math.random() * 240;
    this.entryStartX = offscreen;
    this.entryStartY = this.baseY + (Math.random() - 0.5) * 20;
  }

  private updateContainerSize() {
    const c = this.containerEl;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      this.containerW = r.width;
      this.containerH = r.height;
      this.containerLeft = r.left;
    }
  }

  @HostListener('pointerenter', ['$event'])
  onEnter(ev: PointerEvent) {
    this.isHovering = true;
    this.targetScale = 1.08;
    this.updateHoverOffset(ev);
  }

  @HostListener('pointermove', ['$event'])
  onMove(ev: PointerEvent) {
    if (!this.isHovering) return;
    this.updateHoverOffset(ev);
  }

  @HostListener('pointerleave')
  onLeave() {
    this.isHovering = false;
    this.targetScale = 1;
    this.hoverOffsetX = 0;
    this.hoverOffsetY = 0;
  }

  @HostListener('click')
  onClick() {
    // subtle pop
    this.targetScale = 1.12;
    // ease back down over a short period
    setTimeout(() => (this.targetScale = this.isHovering ? 1.08 : 1), 140);
  }

  private updateHoverOffset(ev: PointerEvent) {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = ev.clientX - centerX;
    const dy = ev.clientY - centerY;
    const distance = Math.hypot(dx, dy) || 1;
    const factor = Math.min(1, 80 / distance);
    // slight attraction toward pointer
    this.hoverOffsetX = dx * 0.06 * factor;
    this.hoverOffsetY = dy * 0.06 * factor;
  }

  private updateFrame(ts: number) {
    const t = (ts - this.startTs) / 1000; // seconds

    // Progress open/close animation
    if (this.floating) {
      const now = performance.now();
      const elapsed = Math.max(
        0,
        now - this.openAnimStartTs - this.openDelayMs,
      );
      const duration = this.openAnimDurationMs;

      const raw = Math.min(1, elapsed / duration);

      // If the animation is complete, lock progress to the target value.
      // Otherwise, calculate the eased progress.
      if (raw >= 1) {
        this.openProgress = this.expanded ? 1 : 0;
      } else {
        const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
        const easeInQuint = (x: number) => x * x * x * x * x;
        const eased = this.expanded ? easeOutQuint(raw) : easeInQuint(raw);
        const target = this.expanded ? 1 : 0;
        this.openProgress =
          this.openStartProgress + (target - this.openStartProgress) * eased;
      }
    }

    // Smooth scale toward target
    this.currentScale += (this.targetScale - this.currentScale) * 0.15;

    // Idle drift and wobble
    // High-quality idle float uses combined low-frequency waves to avoid patterns
    const driftX =
      Math.sin((t + this.phaseOffsetX) * Math.PI * 2 * this.driftSpeedX) *
        this.driftAmplitudeX +
      Math.sin(
        (t + this.phaseOffsetX * 0.37) *
          Math.PI *
          2 *
          (this.driftSpeedX * 0.71),
      ) *
        (this.driftAmplitudeX * 0.7);
    const driftY =
      Math.cos((t + this.phaseOffsetY) * Math.PI * 2 * this.driftSpeedY) *
        this.driftAmplitudeY +
      Math.cos(
        (t + this.phaseOffsetY * 0.41) *
          Math.PI *
          2 *
          (this.driftSpeedY * 0.67),
      ) *
        (this.driftAmplitudeY * 0.7);
    const wobble =
      Math.sin(t * Math.PI * 2 * this.wobbleSpeed) * this.wobbleAmplitudeDeg; // deg

    // Base position depending on open progress
    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
    const bx = lerp(this.entryStartX, this.baseX, this.openProgress);
    const by = lerp(this.entryStartY, this.baseY, this.openProgress);

    // Compose transform
    // Clamp relative offset to keep bubbles tethered around base
    let offX = driftX + (this.isHovering ? this.hoverOffsetX : 0);
    let offY = driftY + (this.isHovering ? this.hoverOffsetY : 0);
    const offDist = Math.hypot(offX, offY);
    const maxR = this.tetherRadius;
    if (offDist > maxR && offDist > 0) {
      const s = maxR / offDist;
      offX *= s;
      offY *= s;
    }

    // Constrain within container bounds so bubbles never leave the panel
    // Center bubbles horizontally beneath the toggle by offsetting half the bubble size
    const bubbleSize =
      Math.max(
        this.el.nativeElement.offsetWidth,
        this.el.nativeElement.offsetHeight,
      ) || 48;

    let tx = (this.floating ? bx : 0) + offX;
    let ty = (this.floating ? by : 0) + offY;
    if (this.floating) {
      tx -= bubbleSize * 0.5; // align bubble center to the toggle center
    }

    // Only clamp to container bounds when sufficiently open; when closed,
    // allow the off-screen position to remain outside the viewport.
    if (this.containerEl && this.openProgress > 0.8) {
      const size = bubbleSize;
      const margin = 6;
      const minX = margin;
      const minY = margin;
      const maxX = this.containerW - size - margin;
      const maxY = this.containerH - size - margin;
      tx = Math.max(minX, Math.min(maxX, tx));
      ty = Math.max(minY, Math.min(maxY, ty));
    }

    // If fully closed, force an explicit off-screen X to guarantee invisibility
    if (this.floating && !this.expanded && this.openProgress <= 0.01) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
      tx = -vw - this.containerLeft - 480; // way outside monitor
    }

    let transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(
      2,
    )}px, 0) rotate(${wobble.toFixed(2)}deg) scale(${this.currentScale.toFixed(
      3,
    )})`;

    // At fully closed state, ensure off-screen using viewport-based calc
    if (this.floating && !this.expanded && this.openProgress <= 0.001) {
      transform = `translate3d(calc(-100vw - 1000px), ${ty.toFixed(
        2,
      )}px, 0) rotate(${wobble.toFixed(2)}deg) scale(${this.currentScale.toFixed(
        3,
      )})`;
    }

    // Write styles directly so we don't rely on Angular change detection
    const el = this.el.nativeElement;
    el.style.transform = transform;
    el.style.pointerEvents =
      !this.floating || this.openProgress > 0.6 ? 'auto' : 'none';
  }
}
