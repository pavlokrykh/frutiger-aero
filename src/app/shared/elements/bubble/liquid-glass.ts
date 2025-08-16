/**
 * Utilities to generate SVG-based displacement filter data URIs
 * for a Liquid Glass-like refraction with optional chromatic aberration.
 *
 * Inspired by techniques discussed by Adrien Gautier (Liquid Glass in CSS and SVG)
 * and using feDisplacementMap with a size-matched displacement map.
 */

export type DisplacementOptions = {
  height: number;
  width: number;
  radius: number;
  depth: number;
  strength?: number;
  chromaticAberration?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Simple memoization cache to avoid regenerating identical SVG data URIs.
const filterCache = new Map<string, string>();

function makeKey(opts: DisplacementOptions) {
  // Quantize sizes to reduce unique keys (snap to 8px grid) which drastically
  // reduces churn from tiny layout differences on mobile.
  const q = (n: number) => Math.round(n / 8) * 8;
  return [
    q(opts.width),
    q(opts.height),
    Math.round(opts.radius),
    Math.round(opts.depth),
    Math.round(opts.strength || 0),
    Math.round((opts.chromaticAberration || 0) * 10),
  ].join('x');
}

/**
 * Create the displacement map used by feDisplacementMap.
 * Gradients take the radius into account so borders get symmetric distortions.
 */
export function getDisplacementMap({
  height,
  width,
  radius,
  depth,
}: Omit<DisplacementOptions, 'chromaticAberration' | 'strength'>): string {
  // Build a map with strong non-linear ramps near edges and extended falloff
  // Increase ramp size so bending persists further from the border
  const edgeRamp = Math.max(2, Math.floor(depth * 2.9));
  const innerX = edgeRamp;
  const innerY = edgeRamp;
  const innerW = Math.max(1, width - edgeRamp * 2);
  const innerH = Math.max(1, height - edgeRamp * 2);
  const outWidth = width;
  const outHeight = height;
  const outDepth = depth;

  const svg = `<svg height="${outHeight}" width="${outWidth}" viewBox="0 0 ${outWidth} ${outHeight}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .mix { mix-blend-mode: screen; }
    </style>
    <defs>
        <radialGradient id="edgeRampY" cx="50%" cy="50%" r="98%">
          <stop offset="0%" stop-color="#000" />
          <stop offset="38%" stop-color="#000" />
          <stop offset="100%" stop-color="#0F0" />
        </radialGradient>
        <radialGradient id="edgeRampX" cx="50%" cy="50%" r="98%">
          <stop offset="0%" stop-color="#000" />
          <stop offset="38%" stop-color="#000" />
          <stop offset="100%" stop-color="#F00" />
        </radialGradient>
    </defs>

  <rect x="0" y="0" height="${outHeight}" width="${outWidth}" fill="#808080" />
    <g>
      <!-- Strong edge ramps; interior kept neutral gray for minimal distortion -->
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#edgeRampY)" class="mix" />
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#edgeRampX)" class="mix" />
      <!-- Keep interior near neutral so the map drives refraction, but allow longer falloff -->
    <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${radius}" ry="${radius}" fill="#808080" fill-opacity="0" />
    <rect x="0" y="0" height="${outHeight}" width="${outWidth}" fill="#808080" fill-opacity="0" filter="blur(${Math.max(1, outDepth)}px)" />
    </g>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * Create the full filter graph with optional chromatic aberration.
 * Returns a data URI that must be referenced with a trailing #displace fragment.
 */
export function getDisplacementFilter({
  height,
  width,
  radius,
  depth,
  strength = 100,
  chromaticAberration = 0,
}: DisplacementOptions): string {
  const safeStrength = clamp(strength, 0, 1200);
  const safeCA = clamp(chromaticAberration, 0, 120);

  // Use quantized key and a memo cache to avoid expensive recomputation on
  // small layout deltas.
  const key = makeKey({
    height,
    width,
    radius,
    depth,
    strength: safeStrength,
    chromaticAberration: safeCA,
  });
  const cached = filterCache.get(key);
  if (cached) return cached;

  // If on low-power/mobile, prefer generating a much smaller SVG filter and
  // reduce the displacement strength/CA to avoid heavy pixel work.
  const map = getDisplacementMap({ height, width, radius, depth });
  const outWidth = width;
  const outHeight = height;

  // Enhanced filter: perform the displacement as before, then derive an "edge"
  // mask from the same displacement map, tint it aqua/white and screen-blend it
  // onto the displaced result to create lighter bluish rim accents.
  const svg = `<svg height="${outHeight}" width="${outWidth}" viewBox="0 0 ${outWidth} ${outHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
    <filter id="displace" color-interpolation-filters="sRGB">
      <!-- Displacement pass -->
      <feImage x="0" y="0" height="${outHeight}" width="${outWidth}" href="${map}" result="dmap" preserveAspectRatio="xMidYMid slice" />
  <feDisplacementMap in="SourceGraphic" in2="dmap" scale="${Math.round(safeStrength)}" xChannelSelector="R" yChannelSelector="G" result="displaced" />

  <!-- Soften artifacts -->
  <feGaussianBlur in="displaced" stdDeviation="0.9" result="blurred" />
      <feColorMatrix type="matrix" values="1.02 0 0 0 0  0 1.01 0 0 0  0 0 1 0 0  0 0 0 1 0" in="blurred" result="colorized" />

      <!-- Edge tint pipeline: use the same displacement map to derive an edge mask -->
      <feImage x="0" y="0" height="${outHeight}" width="${outWidth}" href="${map}" result="edgeMap" preserveAspectRatio="xMidYMid slice" />
  <feGaussianBlur in="edgeMap" stdDeviation="1.6" result="edgeBlur" />
  <feColorMatrix in="edgeBlur" type="luminanceToAlpha" result="edgeAlpha" />
  <feFlood flood-color="#e6fbff" flood-opacity="0.32" result="edgeColor" />
      <feComposite in="edgeColor" in2="edgeAlpha" operator="in" result="edgeTint" />

      <!-- Screen-blend the tint over the colorized displaced graphic for bright aqua rims -->
      <feBlend in="colorized" in2="edgeTint" mode="screen" result="final" />
      <feMerge>
        <feMergeNode in="final" />
      </feMerge>
    </filter>
    </defs>
  </svg>`;
  const data =
    'data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '#displace';

  // Cache result for subsequent similar sizes.
  try {
    filterCache.set(key, data);
    // Keep cache bounded
    if (filterCache.size > 120) {
      // simple FIFO-ish drop
      const first = filterCache.keys().next().value;
      if (typeof first === 'string') filterCache.delete(first);
    }
  } catch {
    // ignore cache failures
  }
  return data;
}

/**
 * Compose a `backdrop-filter` string with the displacement URL.
 * Include some additional blur/brightness/saturation for a glassy look.
 */
export function buildBackdropFilter({
  height,
  width,
  radius,
  depth,
  strength = 200,
  // Slightly higher default CA for a refined iridescent edge
  chromaticAberration = 1.4,
  // Reintroduce a touch more blur (still far less than original)
  blur = 1.8,
}: DisplacementOptions & { blur?: number }): string {
  const url = getDisplacementFilter({
    height,
    width,
    radius,
    depth,
    strength,
    chromaticAberration,
  });

  // Order matters: small pre-blur -> displacement -> small post-blur
  // Keeps clarity while adding a gentle softening of refracted edges
  return `blur(${(blur * 0.7).toFixed(2)}px) url('${url}') blur(${(
    blur * 0.9
  ).toFixed(2)}px) contrast(1.04) brightness(1.02) saturate(1.02)`;
}
