import * as THREE from 'three/webgpu';

const CRYSTAL_ICOSAHEDRON_RADIUS = 0.3;
const CRYSTAL_ICOSAHEDRON_DETAIL = 4;

let sharedGeometry: THREE.IcosahedronGeometry | null = null;

export function getCrystalGeometry(): THREE.IcosahedronGeometry {
  if (!sharedGeometry) {
    sharedGeometry = new THREE.IcosahedronGeometry(
      CRYSTAL_ICOSAHEDRON_RADIUS,
      CRYSTAL_ICOSAHEDRON_DETAIL,
    );
  }
  return sharedGeometry;
}

export function disposeCrystalGeometry(): void {
  sharedGeometry?.dispose();
  sharedGeometry = null;
}

export { CRYSTAL_ICOSAHEDRON_RADIUS, CRYSTAL_ICOSAHEDRON_DETAIL };
