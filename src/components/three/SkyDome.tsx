'use client';

import { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three';
import { skyStops, type SkyPreset } from '@/lib/design/tokens';

/**
 * Gradient sky with a sun.
 *
 * A shader on a large inverted sphere rather than a cube-map or an HDRI: the
 * palette has to shift from noon to sunset as the page scrolls, which a baked
 * environment map cannot do without shipping several megabytes per mood.
 *
 * Colour management is explicit here. `ShaderMaterial` does not inherit the
 * tone-mapping and output-colour-space conversions that three injects into its
 * built-in materials, so both chunks are included manually. Omitting them is
 * the usual cause of a custom sky that looks washed out next to lit geometry
 * sitting in front of it.
 */

const vertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    // Object space is fine: the dome is centred on the origin and large
    // enough that the camera never approaches its shell.
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBottom;
  uniform vec3 uSun;
  uniform vec3 uSunDirection;

  varying vec3 vDirection;

  void main() {
    vec3 dir = normalize(vDirection);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    // Three-stop vertical ramp. The bands overlap so neither seam is visible.
    vec3 color = mix(uBottom, uMid, smoothstep(0.34, 0.54, h));
    color = mix(color, uTop, smoothstep(0.52, 0.97, h));

    // Sun disc plus a broad halo. The halo is what makes the haze near the
    // horizon read as atmosphere rather than a flat gradient.
    float toSun = max(dot(dir, normalize(uSunDirection)), 0.0);
    float disc = pow(toSun, 220.0);
    float halo = pow(toSun, 5.0) * 0.32;
    color += uSun * (disc * 1.5 + halo);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface SkyDomeProps {
  preset?: SkyPreset;
  /** Direction toward the sun. Should match the scene's key light. */
  sunDirection?: [number, number, number];
  radius?: number;
}

export function SkyDome({
  preset = 'afternoon',
  sunDirection = [-0.55, 0.42, -1],
  radius = 320,
}: SkyDomeProps) {
  const material = useMemo(() => {
    const stops = skyStops[preset];
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: BackSide,
      depthWrite: false,
      // `new Color(hex)` converts the sRGB literal into the renderer's linear
      // working space, which is what the shader maths expects.
      uniforms: {
        uTop: { value: new Color(stops.top) },
        uMid: { value: new Color(stops.mid) },
        uBottom: { value: new Color(stops.bottom) },
        uSun: { value: new Color(stops.sun) },
        uSunDirection: { value: new Vector3(...sunDirection).normalize() },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, sunDirection[0], sunDirection[1], sunDirection[2]]);

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1000}>
      {/* Coarse sphere: it only ever shows a smooth gradient, so segments
          beyond this are wasted vertices. */}
      <sphereGeometry args={[radius, 24, 16]} />
    </mesh>
  );
}
