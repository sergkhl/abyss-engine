/**
 * Objects on this layer render for the default scene camera but are skipped by
 * {@link https://threejs.org/docs/#api/en/cameras/CubeCamera CubeCamera} (used by the reflective floor),
 * so particles like altar sparkles do not appear as specks in floor reflections.
 */
export const CUBE_REFLECTION_EXCLUDED_LAYER = 1 as const
