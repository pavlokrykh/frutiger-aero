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
  // Build a map with strong non-linear ramps near edges to exaggerate refraction there
  const edgeRamp = Math.max(2, Math.floor(depth * 2.2));
  const innerX = edgeRamp;
  const innerY = edgeRamp;
  const innerW = Math.max(1, width - edgeRamp * 2);
  const innerH = Math.max(1, height - edgeRamp * 2);
  const svg = `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .mix { mix-blend-mode: screen; }
    </style>
    <defs>
        <radialGradient id="edgeRampY" cx="50%" cy="50%" r="95%">
          <stop offset="0%" stop-color="#000" />
          <stop offset="45%" stop-color="#000" />
          <stop offset="100%" stop-color="#0F0" />
        </radialGradient>
        <radialGradient id="edgeRampX" cx="50%" cy="50%" r="95%">
          <stop offset="0%" stop-color="#000" />
          <stop offset="45%" stop-color="#000" />
          <stop offset="100%" stop-color="#F00" />
        </radialGradient>
    </defs>

    <rect x="0" y="0" height="${height}" width="${width}" fill="#808080" />
    <g>
      <!-- Strong edge ramps; interior kept neutral gray for minimal distortion -->
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#edgeRampY)" class="mix" />
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#edgeRampX)" class="mix" />
      <!-- Reduce interior neutralization so refraction acts deeper into the bubble -->
      <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${radius}" ry="${radius}" fill="#808080" fill-opacity="0" />
      <rect x="0" y="0" height="${height}" width="${width}" fill="#808080" fill-opacity="0" filter="blur(${Math.max(1, depth - 2)}px)" />
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

  const map = getDisplacementMap({ height, width, radius, depth });
  const svg = `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <filter id="displace" color-interpolation-filters="sRGB">
            <feImage x="0" y="0" height="${height}" width="${width}" href="${map}" result="displacementMap" />
            <feDisplacementMap
                in="SourceGraphic"
                in2="displacementMap"
                scale="${safeStrength + safeCA * 2}"
                xChannelSelector="R"
                yChannelSelector="G"
            />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="displacedR"
            />
            <feDisplacementMap
                in="SourceGraphic"
                in2="displacementMap"
                scale="${safeStrength + safeCA}"
                xChannelSelector="R"
                yChannelSelector="G"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="displacedG"
            />
            <feDisplacementMap
                in="SourceGraphic"
                in2="displacementMap"
                scale="${safeStrength}"
                xChannelSelector="R"
                yChannelSelector="G"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="displacedB"
            />
            <!-- Use lighten to avoid over-blue look while preserving refraction separation -->
            <feBlend in="displacedR" in2="displacedG" mode="lighten" />
            <feBlend in2="displacedB" mode="lighten" />
        </filter>
    </defs>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '#displace';
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
  chromaticAberration = 0.8,
  blur = 3.0,
}: DisplacementOptions & { blur?: number }): string {
  const url = getDisplacementFilter({
    height,
    width,
    radius,
    depth,
    strength,
    chromaticAberration,
  });
  // Order matters: a touch of pre-blur -> displacement -> fine blur
  return `blur(${(blur * 0.7).toFixed(2)}px) url('${url}') blur(${(
    blur * 1.0
  ).toFixed(2)}px) contrast(1.05) brightness(1.02) saturate(1.0)`;
}
