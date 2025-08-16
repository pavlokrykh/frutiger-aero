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
import { buildBackdropFilter } from './liquid-glass';

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

  // Liquid glass tuning (can be overridden via inputs)
  @Input() bubbleGlassStrength: number | undefined;
  @Input() bubbleChromaticAberration: number | undefined;
  @Input() bubbleGlassBlur: number | undefined;
  @Input() bubbleGlassDepth: number | undefined;
  @Input() bubbleGlassRadius: number | undefined;
  // Wobble tuning
  @Input() bubbleWobbleIntensity: number | undefined; // 0.5..2.0 (1 default)
  @Input() bubbleWobbleSpeed: number | undefined; // 0.5..2.0 (1 default)

  // Base target position when expanded (randomized per bubble)
  private baseX = 0;
  private baseY = 0;
  // Entry start position (off-screen left)
  private entryStartX = 0;
  private entryStartY = 0;

  // Idle drift configuration (stronger but still natural)
  private driftAmplitudeX = 7 + Math.random() * 7; // px
  private driftAmplitudeY = 7 + Math.random() * 7; // px
  private driftSpeedX = 0.12 + Math.random() * 0.12; // cycles/sec (faster)
  private driftSpeedY = 0.12 + Math.random() * 0.12; // cycles/sec (faster)
  private wobbleSpeed = 0.035 + Math.random() * 0.06; // cycles/sec (faster)
  private wobbleAmplitudeDeg = 2.4 + Math.random() * 1.2; // deg (stronger)
  private phaseOffsetX = Math.random() * Math.PI * 2;
  private phaseOffsetY = Math.random() * Math.PI * 2;
  private tetherRadius = 16 + Math.random() * 8; // px, clamp around base
  // High-quality shape morph (elliptical border-radius wobble)
  private morphPhase1 = Math.random() * Math.PI * 2;
  private morphPhase2 = Math.random() * Math.PI * 2;
  private morphPhase3 = Math.random() * Math.PI * 2;
  private morphPhase4 = Math.random() * Math.PI * 2;
  private morphBaseSpeed = 0.11 + Math.random() * 0.06; // cycles/sec (natural)
  private morphBaseAmplitudePct = 3 + Math.random() * 2; // much more subtle to avoid squareish look
  private morphAnisotropyBase = 0.016 + Math.random() * 0.012; // gentle jelly anisotropy

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

  // Pop/explode interaction state
  private popActive = false;
  private popStartTs = 0;
  private reappearActive = false;
  private reappearStartTs = 0;
  private reappearAtTs = 0;
  private reappearShineEmitted = false;
  private reappearInflationEmitted = false;

  @HostBinding('attr.data-bubble') dataAttr = 'true';

  private readonly el = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private containerEl: HTMLElement | null = null;
  private containerW = 240;
  private containerH = 220;
  private containerLeft = 0;
  private resizeObserver: ResizeObserver | null = null;
  private lastLGUpdate = 0;
  private filterUpdateIntervalMs = 40; // throttle backdrop filter sync (ms)
  // Cache last filter dimensions so we don't rebuild the expensive SVG URI
  private lastFilterWidth = 0;
  private lastFilterHeight = 0;
  // Low-power mode flags and RAF throttling
  private lowPowerMode = false;
  private lastFrameTs = 0;
  private minFrameIntervalMs = 16; // ms between frames (60fps)
  // Track last written styles to avoid redundant DOM writes
  private lastTransform = '';
  private lastOpacity = '';

  ngOnInit(): void {
    // Ensure GPU-friendly transform updates
    const el = this.el.nativeElement;
    el.style.willChange = 'transform, border-radius';
    el.style.transform = 'translate3d(0,0,0)';
    el.style.pointerEvents = 'none';
    el.style.overflow = 'hidden'; // keep pseudo layers clipped to wobbling shape

    // Init backdrop-filter (liquid glass) and keep it in sync with size
    this.updateLiquidGlass();
    // lightweight low-power/mobile detection to reduce visual fidelity
    try {
      const nav = navigator as unknown as {
        connection?: { saveData?: boolean; effectiveType?: string };
        deviceMemory?: number;
      };
      const saveData = !!nav.connection?.saveData;
      const slowNet = /2g|slow-2g/.test(nav.connection?.effectiveType || '');
      const veryLowMem = (nav.deviceMemory || 0) > 0 ? nav.deviceMemory! < 1.5 : false;
      if (saveData || slowNet || veryLowMem) {
        this.lowPowerMode = true;
        this.filterUpdateIntervalMs = 220;
        this.minFrameIntervalMs = 40; // ~25fps
      }
    } catch {
      // ignore
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateLiquidGlass();
      });
      this.resizeObserver.observe(el);
    }

    // Cache container and its size
    this.containerEl =
      (el.closest('.nav-menu') as HTMLElement) ?? el.parentElement;
    this.updateContainerSize();

    // Randomize base target position within a soft radius, creating a chaotic cluster
    this.planLayout();

    // Kick off RAF outside Angular to keep change detection calm
    this.zone.runOutsideAngular(() => {
      const loop = (ts: number) => {
        if (!this.lastFrameTs) this.lastFrameTs = ts;
        const dt = ts - this.lastFrameTs;
        if (dt >= this.minFrameIntervalMs) {
          this.updateFrame(ts);
          this.lastFrameTs = ts;
        }
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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
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
    const spacing = 78 + Math.random() * 12; // larger vertical spacing
    // Read toggle size and anchor bubbles below it
    const hostRect = this.containerEl?.getBoundingClientRect();
    const toggleEl = this.containerEl
      ?.previousElementSibling as HTMLElement | null;
    const toggleRect = toggleEl?.getBoundingClientRect();
    const baseLeft =
      toggleRect && hostRect ? toggleRect.left - hostRect.left : 0;
    const baseTop = toggleRect && hostRect ? toggleRect.top - hostRect.top : 0;
    const anchorX = baseLeft + (toggleRect?.width ?? 48) * 0.5;
    const anchorY = baseTop + (toggleRect?.height ?? 48) + 26; // larger gap below toggle
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
    // Trigger a full pop/explosion animation with delayed reappearance
    if (this.popActive || this.reappearActive) return;
    this.triggerPop();
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
    const now = performance.now();

    // Progress open/close animation
    if (this.floating) {
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

    // Smooth scale toward target when not in pop/reappear sequences
    if (!this.popActive && !this.reappearActive) {
      this.currentScale += (this.targetScale - this.currentScale) * 0.15;
    }

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
    const wobbleIntensity = this.bubbleWobbleIntensity ?? 1;
    const wobbleSpeedMul = this.bubbleWobbleSpeed ?? 1;
    const wobble =
      Math.sin(t * Math.PI * 2 * (this.wobbleSpeed * wobbleSpeedMul)) *
      (this.wobbleAmplitudeDeg * wobbleIntensity); // deg

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

    // Determine scale/opacity overrides for pop and reappear sequences
    let renderScale = this.currentScale;
    let renderOpacity = 1;
    
    // Initialize scale values early to avoid declaration errors
    let scaleX = renderScale;
    let scaleY = renderScale;

    if (this.popActive) {
      const popElapsed = now - this.popStartTs;
      
      // Real bubble pop sequence: brief wobble -> shrink to nothing
      const p = Math.min(1, popElapsed / 70);
      
      if (p < 0.3) {
        // Phase 1: Brief surface tension wobble
        const wobbleP = p / 0.3;
        const wobble = Math.sin(wobbleP * Math.PI * 3) * 0.06;
        renderScale = 1 + wobble;
        renderOpacity = 1 - wobbleP * 0.1;
        
        // Gentle deformation during wobble
        const deform = Math.sin(wobbleP * Math.PI * 4) * 0.08;
        scaleX = renderScale * (1 + deform);
        scaleY = renderScale * (1 - deform * 0.6);
      } else {
        // Phase 2: Continuous shrink to absolute zero
        const shrinkP = (p - 0.3) / 0.7;
        const easeInCubic = (x: number) => x * x * x;
        const shrink = easeInCubic(shrinkP);
        
        // Shrink all the way to 0
        renderScale = (1 - shrink);
        renderOpacity = (1 - shrink);
        
        // Keep circular during shrink
        scaleX = renderScale;
        scaleY = renderScale;
      }

      // Transition to reappear state after a short delay
      if (now >= this.reappearAtTs) {
        this.popActive = false;
        this.reappearActive = true;
        this.reappearStartTs = now;
        this.reappearShineEmitted = false;
        this.reappearInflationEmitted = false;
        this.emitReappearShine();
        this.emitInflationFX();
      }
    } else if (this.reappearActive) {
      const e = now - this.reappearStartTs;
      
      // Realistic bubble inflation: start absolutely tiny -> rapid growth -> settle
      if (e <= 150) {
        // Single phase: Continuous inflation from 0 to full size
        const p = Math.min(1, e / 150);
        
        // Start from absolutely nothing (0.01) and grow to full size
        const easeOutBack = (x: number) => {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        };
        
        const eased = easeOutBack(p);
        renderScale = 0.01 + (1.08 - 0.01) * eased; // slight overshoot
        renderOpacity = Math.min(1, p * 1.5);
        
        // Inflation stretching effect - starts elongated, becomes round
        if (p < 0.7) {
          const stretch = Math.sin(p * Math.PI) * 0.15;
          scaleX = renderScale * (1 - stretch * 0.4);
          scaleY = renderScale * (1 + stretch * 0.8);
        } else {
          // Final phase: settle to perfect circle
          const settleP = (p - 0.7) / 0.3;
          const settle = (1 - settleP) * 0.08;
          scaleX = renderScale * (1 + settle);
          scaleY = renderScale * (1 - settle * 0.5);
        }
      } else if (e <= 200) {
        // Quick settle to normal size
        const p = Math.min(1, (e - 150) / 50);
        const easeOut = 1 - Math.pow(1 - p, 2);
        renderScale = 1.08 + (1 - 1.08) * easeOut;
        renderOpacity = 1;
        scaleX = renderScale;
        scaleY = renderScale;
      } else {
        this.reappearActive = false;
        renderScale = 1;
        renderOpacity = 1;
      }
    }

    // Scale values are now initialized above and modified by pop/reappear logic

    // High-quality border-radius morph + subtle idle anisotropy
    // This runs even when not inflating, to emulate soft jelly dynamics
    if (!this.popActive && !this.reappearActive) {
      const morphSpeedMul = this.bubbleWobbleSpeed ?? 1;
      const morphIntensity = this.bubbleWobbleIntensity ?? 1;
      // Scale bends slightly with actual bubble size to keep large bubbles expressive
      const sizeScale = Math.min(
        1.8,
        Math.max(
          0.9,
          (Math.max(
            this.el.nativeElement.offsetWidth,
            this.el.nativeElement.offsetHeight,
          ) || 48) / 56,
        ),
      );
      const amp = this.morphBaseAmplitudePct * morphIntensity * sizeScale; // percentage points
      const p = t * this.morphBaseSpeed * morphSpeedMul * Math.PI * 2;

      // Use mixed frequencies to avoid obvious repetition
      const tlx =
        50 +
        amp *
          (Math.sin(p + this.morphPhase1) * 0.7 +
            Math.sin(p * 0.5 + this.morphPhase2) * 0.3);
      const trx =
        50 +
        amp *
          (Math.sin(p * 0.9 + this.morphPhase2) * 0.65 +
            Math.cos(p * 0.42 + this.morphPhase3) * 0.35);
      const brx =
        50 +
        amp *
          (Math.cos(p * 1.07 + this.morphPhase3) * 0.72 +
            Math.sin(p * 0.53 + this.morphPhase4) * 0.28);
      const blx =
        50 +
        amp *
          (Math.cos(p * 0.84 + this.morphPhase4) * 0.68 +
            Math.sin(p * 0.37 + this.morphPhase1) * 0.32);

      const tly =
        50 +
        amp *
          (Math.cos(p * 0.88 + this.morphPhase1) * 0.7 +
            Math.sin(p * 0.44 + this.morphPhase3) * 0.3);
      const try_ =
        50 +
        amp *
          (Math.sin(p * 0.93 + this.morphPhase2) * 0.66 +
            Math.cos(p * 0.49 + this.morphPhase4) * 0.34);
      const bry =
        50 +
        amp *
          (Math.sin(p * 1.12 + this.morphPhase3) * 0.7 +
            Math.cos(p * 0.46 + this.morphPhase1) * 0.3);
      const bly =
        50 +
        amp *
          (Math.cos(p * 0.91 + this.morphPhase4) * 0.64 +
            Math.sin(p * 0.41 + this.morphPhase2) * 0.36);

      const clampPct = (v: number) => Math.max(42, Math.min(58, v)); // much tighter range for natural look
      const brString = `${clampPct(tlx).toFixed(2)}% ${clampPct(trx).toFixed(2)}% ${clampPct(
        brx,
      ).toFixed(
        2,
      )}% ${clampPct(blx).toFixed(2)}% / ${clampPct(tly).toFixed(2)}% ${clampPct(
        try_,
      ).toFixed(2)}% ${clampPct(bry).toFixed(2)}% ${clampPct(bly).toFixed(2)}%`;

      const el = this.el.nativeElement;
      el.style.borderRadius = brString;

      // Idle anisotropy synced to morph for a jelly effect
      const jelly = Math.sin(p * 0.5 + this.morphPhase2);
      const idleAniso = this.morphAnisotropyBase * morphIntensity;
      if (!this.reappearActive) {
        scaleX *= 1 + idleAniso * jelly;
        scaleY *= 1 - idleAniso * jelly;
      }

      // Keep displacement filter roughly in sync with the changing shape
      if (now - this.lastLGUpdate > this.filterUpdateIntervalMs) {
        this.updateLiquidGlass();
        this.lastLGUpdate = now;
      }
    } else if (this.popActive) {
      // Gentle deformation during pop - border-radius slightly irregular
      const popElapsed = now - this.popStartTs;
      if (popElapsed <= 28) { // only during wobble phase
        const p = Math.min(1, popElapsed / 28);
        const wobble = Math.sin(p * Math.PI * 3) * 0.15; // much gentler
        const el = this.el.nativeElement;
        // Slight irregularity as surface tension fluctuates
        const r1 = 50 + wobble * 8;
        const r2 = 50 - wobble * 6;
        const r3 = 50 + wobble * 5;
        const r4 = 50 - wobble * 7;
        el.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`;
      } else {
        // During shrink, maintain perfect circle
        const el = this.el.nativeElement;
        el.style.borderRadius = '50%';
      }
    } else if (this.reappearActive) {
      // Smooth formation - border-radius gradually becomes perfect circle
      const e = now - this.reappearStartTs;
      const el = this.el.nativeElement;
      
      if (e <= 100) {
        // During early inflation, slight irregularity as membrane forms
        const p = Math.min(1, e / 100);
        const formation = Math.sin(p * Math.PI * 1.5) * (1 - p) * 6;
        const base = 50;
        el.style.borderRadius = `${base + formation}% ${base - formation * 0.5}% ${base + formation * 0.3}% ${base - formation * 0.4}%`;
      } else {
        // Perfect circle achieved
        el.style.borderRadius = '50%';
      }
    }

    let transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(
      2,
    )}px, 0) rotate(${wobble.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;

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
    el.style.opacity = `${renderOpacity}`;
    el.style.pointerEvents =
      !this.floating || this.openProgress > 0.6 ? 'auto' : 'none';
    if (this.popActive || this.reappearActive) {
      el.style.pointerEvents = 'none';
    }
  }

  private updateLiquidGlass() {
    const el = this.el.nativeElement;
    // If the element currently has a CSS transform (scale/etc.), prefer the
    // layout size (offsetWidth/offsetHeight) so the generated SVG filter
    // remains stable and doesn't resize in coarse steps while the bubble
    // is being smoothly transformed. This prevents the visible "reapply"
    // stutter where the filter is recreated only a few times during a
    // continuous CSS scale.
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const hasTransform = !!(cs && cs.transform && cs.transform !== 'none');

    const width = Math.max(
      1,
      Math.round(
        (hasTransform ? el.offsetWidth : rect.width) || el.offsetWidth || 48,
      ),
    );
    const height = Math.max(
      1,
      Math.round(
        (hasTransform ? el.offsetHeight : rect.height) || el.offsetHeight || 48,
      ),
    );

    // If dimensions haven't meaningfully changed since the last build,
    // skip rebuilding the expensive SVG/data-uri filter.
    if (width === this.lastFilterWidth && height === this.lastFilterHeight) {
      return;
    }
    // Enlarge radius for refraction so bending starts further from edge
    const visualRadius = Math.round(
      this.bubbleGlassRadius ?? this.computeRadiusPx(el, width, height),
    );
    const depth = Math.round(
      this.bubbleGlassDepth ?? this.computeDepthPx(Math.min(width, height)),
    );
    const strength = this.bubbleGlassStrength ?? 520;
    // Slightly stronger default CA to introduce a gentle colored rim
    const chromaticAberration = this.bubbleChromaticAberration ?? 1.6;
    // Small but noticeable blur for a soft refraction
    const blur = this.bubbleGlassBlur ?? 1.6;

    const filter = buildBackdropFilter({
      width,
      height,
      // Push refraction influence to ~50% of bubble size
      radius: Math.min(
        Math.max(visualRadius, Math.floor(Math.min(width, height) * 0.5)),
        Math.floor(Math.min(width, height) / 2),
      ),
      // Extend influence further into the bubble
      depth: Math.max(depth, Math.floor(Math.min(width, height) * 0.7)),
      // Increase minimum strength for harder bending
      strength: Math.min(1200, Math.max(strength, 700)),
      chromaticAberration: Math.max(0.4, chromaticAberration),
      // Keep a minimum so the softening is perceptible but subtle
      blur: Math.max(1.0, blur),
    });

    el.style.setProperty('backdrop-filter', filter);
    el.style.setProperty('-webkit-backdrop-filter', filter);

  this.lastFilterWidth = width;
  this.lastFilterHeight = height;
  }

  private computeRadiusPx(
    el: HTMLElement,
    width: number,
    height: number,
  ): number {
    const cs = getComputedStyle(el);
    // Try top-left radius first. If not a number, fallback to circle guess
    const raw = cs.borderTopLeftRadius || cs.borderRadius;
    const parsed = parseFloat(raw || '0');
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return Math.min(width, height) * 0.5; // circle-like
  }

  private computeDepthPx(size: number): number {
    // Depth scales with size. Push deeper so refraction bends longer into the interior.
    const d = size * 0.62; // ~62% of the smaller dimension
    return Math.max(10, Math.min(120, Math.round(d)));
  }

  private triggerPop() {
    this.popActive = true;
    this.popStartTs = performance.now();
    // Quick pop like real bubble: immediate burst, quick reappear
    this.reappearAtTs = this.popStartTs + 200 + Math.random() * 100;

    // Delay particle burst until shrink phase begins (at 40% of pop animation)
    setTimeout(() => {
      if (this.popActive) {
        this.createBubbleBurst();
      }
    }, 28); // 40% of 70ms pop duration
  }

  private emitReappearShine() {
    if (this.reappearShineEmitted) return;
    this.reappearShineEmitted = true;
    const el = this.el.nativeElement;
    
    // Subtle surface tension shimmer as bubble forms
    const shine = document.createElement('div');
    Object.assign(shine.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0) 60%)',
      opacity: '0',
    } as CSSStyleDeclaration);
    el.appendChild(shine);
    
    shine.animate([
      { opacity: 0 },
      { opacity: 0.8 },
      { opacity: 0.3 },
      { opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-out',
      fill: 'forwards',
    }).onfinish = () => shine.remove();
  }

  private emitInflationFX() {
    if (this.reappearInflationEmitted) return;
    this.reappearInflationEmitted = true;

    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const w = rect.width || 48;
    const h = rect.height || 48;

    // Subtle surface tension ring - like real bubble forming
    const rim = document.createElement('div');
    Object.assign(rim.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      background: 'radial-gradient(circle, rgba(255,255,255,0) 70%, rgba(255,255,255,0.6) 85%, rgba(255,255,255,0) 100%)',
      opacity: '0',
      transform: 'scale(0.9)',
    } as CSSStyleDeclaration);
    el.appendChild(rim);
    
    rim.animate([
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1.02)', opacity: 0.7 },
      { transform: 'scale(1.0)', opacity: 0 }
    ], {
      duration: 180,
      easing: 'ease-out',
      fill: 'forwards',
    }).onfinish = () => rim.remove();

    // Tiny formation sparkles - minimal and realistic
    const sparkleCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement('div');
      const size = 1 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(w, h) * 0.3;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      Object.assign(sparkle.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `${-size / 2}px`,
        marginTop: `${-size / 2}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0.3))',
        boxShadow: '0 0 3px rgba(255,255,255,0.8)',
        pointerEvents: 'none',
        transform: `translate3d(${x}px, ${y}px, 0) scale(0)`,
        opacity: '0',
      } as CSSStyleDeclaration);
      
      el.appendChild(sparkle);
      
      sparkle.animate([
        { transform: `translate3d(${x}px, ${y}px, 0) scale(0)`, opacity: 0 },
        { transform: `translate3d(${x}px, ${y}px, 0) scale(1)`, opacity: 0.9 },
        { transform: `translate3d(${x}px, ${y}px, 0) scale(0)`, opacity: 0 }
      ], {
        duration: 120 + Math.random() * 80,
        easing: 'ease-out',
        fill: 'forwards',
      }).onfinish = () => sparkle.remove();
    }
  }

  private createBubbleBurst() {
    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const bubbleSize = Math.max(rect.width, rect.height);

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '9999';
    document.body.appendChild(wrapper);

    // Membrane fragments - fewer but higher quality
    const fragmentCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < fragmentCount; i++) {
      const fragment = document.createElement('div');
      const angle = (i / fragmentCount) * Math.PI * 2 + (Math.random() - 0.5) * 1.2;
      const width = 12 + Math.random() * 16; // larger, more visible fragments
      const height = 3 + Math.random() * 4;
      const distance = bubbleSize * 0.5 + Math.random() * bubbleSize * 0.3;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const rotation = angle * (180 / Math.PI) + (Math.random() - 0.5) * 45;
      
      Object.assign(fragment.style, {
        position: 'absolute',
        left: `${cx - width / 2}px`,
        top: `${cy - height / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '3px',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.95) 100%)',
        boxShadow: '0 0 4px rgba(255,255,255,0.9), inset 0 0 3px rgba(0,0,0,0.15)',
        transform: `rotate(${rotation}deg) scale(1)`,
        opacity: '0.9',
      } as CSSStyleDeclaration);
      
      wrapper.appendChild(fragment);
      
      // Fragments fly out and fade quickly like real bubble skin
      fragment.animate([
        { 
          transform: `rotate(${rotation}deg) scale(1)`, 
          opacity: 0.95 
        },
        { 
          transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) rotate(${rotation + (Math.random() - 0.5) * 180}deg) scale(0.8)`, 
          opacity: 0.6 
        },
        { 
          transform: `translate(${dx}px, ${dy}px) rotate(${rotation + (Math.random() - 0.5) * 360}deg) scale(0.3)`, 
          opacity: 0 
        }
      ], {
        duration: 180 + Math.random() * 120,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      }).onfinish = () => fragment.remove();
    }

    // Tiny water droplets - fewer, more realistic
    const dropletCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < dropletCount; i++) {
      const droplet = document.createElement('div');
      const size = 1.5 + Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const distance = bubbleSize * 0.3 + Math.random() * bubbleSize * 0.5;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + Math.random() * 10; // slight downward bias
      
      Object.assign(droplet.style, {
        position: 'absolute',
        left: `${cx - size / 2}px`,
        top: `${cy - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(200,230,255,0.8) 60%, rgba(150,200,255,0.6))',
        boxShadow: '0 0 2px rgba(255,255,255,0.5)',
        transform: 'scale(1)',
        opacity: '0.9',
      } as CSSStyleDeclaration);
      
      wrapper.appendChild(droplet);
      
      // Droplets arc naturally with gravity
      droplet.animate([
        { 
          transform: 'scale(1)', 
          opacity: 0.9 
        },
        { 
          transform: `translate(${dx * 0.7}px, ${dy * 0.7 + 5}px) scale(0.9)`, 
          opacity: 0.7 
        },
        { 
          transform: `translate(${dx}px, ${dy + 15}px) scale(0.6)`, 
          opacity: 0 
        }
      ], {
        duration: 200 + Math.random() * 150,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      }).onfinish = () => droplet.remove();
    }

    // Single subtle "pop" flash - very brief like real bubble
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'absolute',
      left: `${cx - bubbleSize / 2}px`,
      top: `${cy - bubbleSize / 2}px`,
      width: `${bubbleSize}px`,
      height: `${bubbleSize}px`,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0) 70%)',
      transform: 'scale(0.8)',
      opacity: '0.7',
    } as CSSStyleDeclaration);
    
    wrapper.appendChild(flash);
    flash.animate([
      { transform: 'scale(0.8)', opacity: 0.7 },
      { transform: 'scale(1.1)', opacity: 0 }
    ], {
      duration: 80,
      easing: 'ease-out',
      fill: 'forwards'
    }).onfinish = () => flash.remove();

    // Clean up wrapper quickly
    setTimeout(() => wrapper.remove(), 500);
  }
}
