import { Fn, float, vec3, triNoise3D } from 'three/tsl';

/**
 * Organic low-frequency displacement (levels 1–2 emphasis).
 */
export const crystalLowFrequencyNoise = Fn(([position, subjectSeed, freqScale]) => {
  const seed = float(subjectSeed);
  const p = vec3(position).mul(freqScale).add(vec3(seed, seed.mul(1.713), seed.mul(0.291)));
  return triNoise3D(p, float(1), float(0));
});

/**
 * Faceted high-frequency displacement (levels 3–5); tri-noise stands in for cellular Voronoi for cost.
 */
export const crystalHighFrequencyNoise = Fn(([position, subjectSeed, freqScale]) => {
  const seed = float(subjectSeed);
  const p = vec3(position).mul(freqScale).add(vec3(seed.mul(2.17), seed, seed.mul(3.09)));
  return triNoise3D(p, float(2.1), float(0));
});
