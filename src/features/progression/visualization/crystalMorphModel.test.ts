import { describe, expect, it } from 'vitest';

import {
  getCrystalMorphParams,
  getDisplacementParams,
  getLevelBandProgress,
  getMaterialParams,
  ceremonialEase,
  subjectSeedFromId,
} from './crystalMorphModel';

describe('crystalMorphModel', () => {
  it('returns stone-like params at level 0 with morph settled', () => {
    const d = getDisplacementParams(0, 1);
    expect(d.lowFreqAmplitude).toBe(0);
    const m = getMaterialParams(0, 1);
    expect(m.transmissionFactor).toBe(0);
    expect(m.roughness).toBeCloseTo(0.95);
  });

  it('returns high transmission at max level when morph settled', () => {
    const m = getMaterialParams(5, 1);
    expect(m.transmissionFactor).toBeCloseTo(0.92);
    expect(m.roughness).toBeCloseTo(0.05);
  });

  it('interpolates displacement between adjacent tiers when morphProgress moves', () => {
    const atStart = getDisplacementParams(3, 0);
    const atEnd = getDisplacementParams(3, 1);
    expect(atStart.lowFreqAmplitude).not.toBeCloseTo(atEnd.lowFreqAmplitude);
    const mid = getDisplacementParams(3, 0.5);
    expect(mid.lowFreqAmplitude).toBeGreaterThan(Math.min(atStart.lowFreqAmplitude, atEnd.lowFreqAmplitude) - 1e-6);
    expect(mid.lowFreqAmplitude).toBeLessThan(Math.max(atStart.lowFreqAmplitude, atEnd.lowFreqAmplitude) + 1e-6);
  });

  it('computes level band progress from XP', () => {
    expect(getLevelBandProgress(0)).toBe(0);
    expect(getLevelBandProgress(50)).toBeCloseTo(0.5);
    expect(getLevelBandProgress(100)).toBe(0);
    expect(getLevelBandProgress(150)).toBeCloseTo(0.5);
  });

  it('aggregates getCrystalMorphParams', () => {
    const p = getCrystalMorphParams(250, 1);
    expect(p.level).toBe(2);
    expect(p.material.metalness).toBe(0);
  });

  it('ceremonialEase is 0 and 1 at edges', () => {
    expect(ceremonialEase(0)).toBe(0);
    expect(ceremonialEase(1)).toBe(1);
  });

  it('subjectSeedFromId is deterministic in 0–1', () => {
    expect(subjectSeedFromId('sub-a')).toBe(subjectSeedFromId('sub-a'));
    expect(subjectSeedFromId(null)).toBe(0.5);
    expect(subjectSeedFromId('x')).toBeGreaterThanOrEqual(0);
    expect(subjectSeedFromId('x')).toBeLessThanOrEqual(1);
  });
});
