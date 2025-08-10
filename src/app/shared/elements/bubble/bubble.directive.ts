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

    // Determine scale/opacity overrides for pop and reappear sequences
    let renderScale = this.currentScale;
    let renderOpacity = 1;

    if (this.popActive) {
      // Realistic pop: the membrane vanishes immediately
      renderScale = 1;
      renderOpacity = 0;

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
      // Inflate like mouth-blown bubble: gentle ease-in, mild overshoot, slow settle
      if (e <= 300) {
        const p = Math.min(1, e / 300);
        // easeInOutCubic for smooth inflate
        const easeInOutCubic = (x: number) =>
          x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        const eased = easeInOutCubic(p);
        const startScale = 0.15;
        const targetScale = 1.08;
        renderScale = startScale + (targetScale - startScale) * eased;
        renderOpacity = Math.min(1, (e / 300) * 1.2);
      } else if (e <= 500) {
        const p = Math.min(1, (e - 300) / 280);
        // subtle settle from 1.08 -> 1.0
        const easeOut = 1 - Math.pow(1 - p, 3);
        renderScale = 1.08 + (1 - 1.08) * easeOut;
        renderOpacity = 1;
      } else {
        this.reappearActive = false;
        renderScale = 1;
        renderOpacity = 1;
      }
    }

    // Non-uniform squash-and-stretch during inflation
    let scaleX = renderScale;
    let scaleY = renderScale;
    if (this.reappearActive) {
      const e = now - this.reappearStartTs;
      const phase1 = 420; // inflate
      const phase2 = 700; // settle
      if (e <= phase1) {
        const p = Math.min(1, e / phase1);
        const squash = Math.sin(p * Math.PI * 0.9);
        scaleX = renderScale * (1 + 0.06 * squash);
        scaleY = renderScale * (1 - 0.05 * squash);
      } else if (e <= phase2) {
        const p = Math.min(1, (e - phase1) / (phase2 - phase1));
        const squash = Math.sin((1 - p) * Math.PI * 0.6);
        scaleX = renderScale * (1 - 0.03 * squash);
        scaleY = renderScale * (1 + 0.04 * squash);
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

  private triggerPop() {
    this.popActive = true;
    this.popStartTs = performance.now();
    // Dramatic pop: allow explosion visuals to play, then reappear
    this.reappearAtTs = this.popStartTs + 420 + Math.random() * 220;

    // Visual explosion particles and shockwave
    this.createExplosion();
  }

  private emitReappearShine() {
    if (this.reappearShineEmitted) return;
    this.reappearShineEmitted = true;
    const el = this.el.nativeElement;
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
      background:
        'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 44%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 56%, rgba(255,255,255,0) 100%)',
      transform: 'translateX(-160%) skewX(-14deg)',
      opacity: '0.85',
    } as CSSStyleDeclaration);
    el.appendChild(shine);
    const anim = shine.animate(
      [
        { transform: 'translateX(-160%) skewX(-14deg)', opacity: 0.85 },
        { transform: 'translateX(160%) skewX(-14deg)', opacity: 0.0 },
      ],
      {
        duration: 420,
        easing: 'cubic-bezier(0.15, 0.7, 0.2, 1)',
        fill: 'forwards',
      },
    );
    anim.onfinish = () => shine.remove();
  }

  private emitInflationFX() {
    if (this.reappearInflationEmitted) return;
    this.reappearInflationEmitted = true;

    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const w = rect.width || 48;
    const h = rect.height || 48;

    // Rim halo (subtle bright edge that settles)
    const rim = document.createElement('div');
    Object.assign(rim.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      background:
        'radial-gradient(65% 65% at 50% 50%, rgba(255,255,255,0) 55%, rgba(190,240,255,0.8) 82%, rgba(190,240,255,0) 100%)',
      opacity: '0.0',
      transform: 'scale(0.8)',
    } as CSSStyleDeclaration);
    el.appendChild(rim);
    const rimAnim = rim.animate(
      [
        { transform: 'scale(0.8)', opacity: 0.0 },
        { transform: 'scale(1.05)', opacity: 0.85 },
        { transform: 'scale(1.0)', opacity: 0.2 },
        { transform: 'scale(1.0)', opacity: 0.0 },
      ],
      {
        duration: 520,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        fill: 'forwards',
      },
    );
    rimAnim.onfinish = () => rim.remove();

    // Inner pulse ring
    const inner = document.createElement('div');
    const size = Math.min(w, h) * 0.48;
    Object.assign(inner.style, {
      position: 'absolute',
      left: `calc(50% - ${size / 2}px)`,
      top: `calc(50% - ${size / 2}px)`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '999px',
      border: '2px solid rgba(180, 235, 255, 0.8)',
      boxShadow: '0 0 10px rgba(160, 230, 255, 0.6)',
      pointerEvents: 'none',
      transform: 'scale(0.6)',
      opacity: '0.0',
    } as CSSStyleDeclaration);
    el.appendChild(inner);
    const innerAnim = inner.animate(
      [
        { transform: 'scale(0.6)', opacity: 0.0 },
        { transform: 'scale(1.2)', opacity: 0.9 },
        { transform: 'scale(1.8)', opacity: 0.0 },
      ],
      {
        duration: 360,
        easing: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
        fill: 'forwards',
      },
    );
    innerAnim.onfinish = () => inner.remove();

    // Ingress droplets (merge into the bubble center)
    const ingressCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < ingressCount; i++) {
      const drop = document.createElement('div');
      const sz = 2 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = (Math.min(w, h) / 2) * (0.8 + Math.random() * 0.2);
      const startX = Math.cos(angle) * radius;
      const startY = Math.sin(angle) * radius;
      Object.assign(drop.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${sz}px`,
        height: `${sz}px`,
        marginLeft: `${-sz / 2}px`,
        marginTop: `${-sz / 2}px`,
        borderRadius: '999px',
        background:
          'radial-gradient(60% 60% at 50% 50%, rgba(180, 240, 255, 0.95), rgba(255,255,255,0) 70%)',
        pointerEvents: 'none',
        transform: `translate3d(${startX}px, ${startY}px, 0)`,
        opacity: '0.9',
      } as CSSStyleDeclaration);
      el.appendChild(drop);
      const driftX = (Math.random() - 0.5) * 6;
      const driftY = (Math.random() - 0.5) * 6;
      const anim = drop.animate(
        [
          {
            transform: `translate3d(${startX}px, ${startY}px, 0)`,
            opacity: 0.9,
          },
          {
            transform: `translate3d(${driftX}px, ${driftY}px, 0)`,
            opacity: 0.0,
          },
        ],
        {
          duration: 300 + Math.random() * 180,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
          fill: 'forwards',
        },
      );
      anim.onfinish = () => drop.remove();
    }
  }

  private createExplosion() {
    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '9999';
    document.body.appendChild(wrapper);

    // Bright core flash
    const flash = document.createElement('div');
    const flashSize = Math.max(rect.width, rect.height) * 0.7;
    Object.assign(flash.style, {
      position: 'absolute',
      left: `${cx - flashSize / 2}px`,
      top: `${cy - flashSize / 2}px`,
      width: `${flashSize}px`,
      height: `${flashSize}px`,
      borderRadius: '999px',
      background:
        'radial-gradient(60% 60% at 50% 50%, rgba(230, 250, 255, 0.9), rgba(230, 250, 255, 0.4) 45%, rgba(230, 250, 255, 0) 70%)',
      filter: 'blur(0.5px)',
      opacity: '0.9',
      transform: 'scale(0.6)',
    } as CSSStyleDeclaration);
    wrapper.appendChild(flash);
    flash.animate(
      [
        { transform: 'scale(0.6)', opacity: 0.9 },
        { transform: 'scale(1.6)', opacity: 0 },
      ],
      {
        duration: 120,
        easing: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
        fill: 'forwards',
      },
    );

    // Shockwave rings
    const baseSize = Math.max(rect.width, rect.height) * 1.0;
    const ring1 = document.createElement('div');
    Object.assign(ring1.style, {
      position: 'absolute',
      left: `${cx - baseSize / 2}px`,
      top: `${cy - baseSize / 2}px`,
      width: `${baseSize}px`,
      height: `${baseSize}px`,
      borderRadius: '999px',
      border: '2px solid rgba(140, 225, 255, 0.8)',
      boxShadow: '0 0 12px rgba(140, 225, 255, 0.6)',
      transform: 'scale(1)',
      opacity: '0.9',
    } as CSSStyleDeclaration);
    wrapper.appendChild(ring1);
    ring1.animate(
      [
        { transform: 'scale(1)', opacity: 0.9 },
        { transform: 'scale(2.2)', opacity: 0 },
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.25, 0.6, 0.2, 1)',
        fill: 'forwards',
      },
    );

    const ring2 = document.createElement('div');
    Object.assign(ring2.style, {
      position: 'absolute',
      left: `${cx - baseSize / 2}px`,
      top: `${cy - baseSize / 2}px`,
      width: `${baseSize}px`,
      height: `${baseSize}px`,
      borderRadius: '999px',
      border: '1px solid rgba(160, 235, 255, 0.6)',
      transform: 'scale(1)',
      opacity: '0.7',
      filter: 'blur(0.3px)',
    } as CSSStyleDeclaration);
    wrapper.appendChild(ring2);
    ring2.animate(
      [
        { transform: 'scale(1)', opacity: 0.7 },
        { transform: 'scale(3.0)', opacity: 0 },
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
        fill: 'forwards',
      },
    );

    // Mist plumes
    for (let i = 0; i < 2; i++) {
      const mist = document.createElement('div');
      const size = baseSize * (0.7 + Math.random() * 0.4);
      Object.assign(mist.style, {
        position: 'absolute',
        left: `${cx - size / 2}px`,
        top: `${cy - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '999px',
        background:
          'radial-gradient(60% 60% at 50% 50%, rgba(160, 240, 255, 0.35), rgba(160, 240, 255, 0) 70%)',
        filter: 'blur(6px)',
        opacity: '0.45',
        transform: 'scale(0.8)',
      } as CSSStyleDeclaration);
      wrapper.appendChild(mist);
      mist.animate(
        [
          { transform: 'scale(0.8)', opacity: 0.45 },
          { transform: 'scale(1.6)', opacity: 0 },
        ],
        {
          duration: 320 + Math.random() * 120,
          easing: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
          fill: 'forwards',
        },
      );
    }

    // Water droplets (round)
    const dropletCount = 18 + Math.floor(Math.random() * 10);
    const dropletPalette = [
      'rgba(150, 230, 255, 0.95)',
      'rgba(120, 210, 255, 0.95)',
      'rgba(90, 200, 240, 0.95)',
      'rgba(170, 245, 255, 0.95)',
    ];
    for (let i = 0; i < dropletCount; i++) {
      const p = document.createElement('div');
      const size = 3 + Math.random() * 4.5;
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 110;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + (8 + Math.random() * 18);
      const color =
        dropletPalette[Math.floor(Math.random() * dropletPalette.length)];
      Object.assign(p.style, {
        position: 'absolute',
        left: `${cx - size / 2}px`,
        top: `${cy - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '999px',
        background: `radial-gradient(60% 60% at 50% 50%, ${color}, rgba(255,255,255,0) 70%)`,
        boxShadow: '0 1px 4px rgba(0, 60, 120, 0.18)',
        transform: 'translate3d(0,0,0) scale(0.9)',
        opacity: '0.98',
      } as CSSStyleDeclaration);
      wrapper.appendChild(p);
      const travel = p.animate(
        [
          { transform: 'translate3d(0,0,0) scale(0.9)', opacity: 0.98 },
          {
            transform: `translate3d(${dx * 0.7}px, ${dy * 0.7}px, 0) scale(0.75)`,
            opacity: 0.7,
          },
          {
            transform: `translate3d(${dx}px, ${dy + 12}px, 0) scale(0.6)`,
            opacity: 0,
          },
        ],
        {
          duration: 280 + Math.random() * 240,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
          fill: 'forwards',
        },
      );
      travel.onfinish = () => p.remove();
    }

    // Membrane shards (streaks)
    const streakCount = 10 + Math.floor(Math.random() * 8);
    for (let i = 0; i < streakCount; i++) {
      const sEl = document.createElement('div');
      const length = 10 + Math.random() * 18;
      const thickness = 1 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle) * (60 + Math.random() * 120);
      const dy = Math.sin(angle) * (60 + Math.random() * 120);
      const deg = (angle * 180) / Math.PI;
      Object.assign(sEl.style, {
        position: 'absolute',
        left: `${cx - thickness / 2}px`,
        top: `${cy - thickness / 2}px`,
        width: `${length}px`,
        height: `${thickness}px`,
        borderRadius: '2px',
        background:
          'linear-gradient(90deg, rgba(200, 245, 255, 0.0) 0%, rgba(200, 245, 255, 0.8) 40%, rgba(200, 245, 255, 0.0) 100%)',
        transformOrigin: '0 50%',
        transform: `rotate(${deg}deg) translate3d(0,0,0)`,
        opacity: '0.95',
        filter: 'blur(0.2px)',
      } as CSSStyleDeclaration);
      wrapper.appendChild(sEl);
      const anim = sEl.animate(
        [
          { transform: `rotate(${deg}deg) translate3d(0,0,0)`, opacity: 0.95 },
          {
            transform: `rotate(${deg}deg) translate3d(${dx}px, ${dy}px, 0)`,
            opacity: 0,
          },
        ],
        {
          duration: 260 + Math.random() * 240,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
          fill: 'forwards',
        },
      );
      anim.onfinish = () => sEl.remove();
    }

    // Cleanup overlay
    setTimeout(() => wrapper.remove(), 1000);
  }
}
