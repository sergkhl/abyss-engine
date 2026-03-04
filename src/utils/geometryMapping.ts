/**
 * Geometry Mapping Utilities for Multi-Floor Architecture
 *
 * This module provides utilities to map subject geometry preferences
 * to Three.js geometries. It enables the extensible system where each
 * subject in the JSON defines its own preferred geometry types.
 *
 * Usage:
 *   import { getGeometryForSubject, createSubjectGeometry } from './geometryMapping';
 *
 *   const geometry = getGeometryForSubject(subjectId, 'crystal');
 *   const { gridGeometry, crystalGeometry, altarGeometry } = createSubjectGeometry(subjectId);
 */

import * as THREE from 'three';
import { getDeckData } from '../data/deckCatalog';
import { Deck, Subject, GeometryType, SubjectGeometry } from '../types';

function getDeckSnapshot() {
  return getDeckData();
}

// NOTE: Geometry metadata is sourced from local catalog data.

// ============================================================================
// Geometry Cache - Module-level cache for geometries
// ============================================================================

/**
 * Cache for geometries to avoid recreation on each render
 */
const geometryCache: Map<string, THREE.BufferGeometry> = new Map();

// ============================================================================
// Geometry Factory Functions
// ============================================================================

/**
 * Create a BoxGeometry with standard dimensions
 */
function createBoxGeometry(): THREE.BoxGeometry {
  return new THREE.BoxGeometry(0.4, 0.6, 0.4);
}

/**
 * Create a CylinderGeometry with standard dimensions
 */
function createCylinderGeometry(): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
}

/**
 * Create a SphereGeometry with standard dimensions
 */
function createSphereGeometry(): THREE.SphereGeometry {
  return new THREE.SphereGeometry(0.25, 16, 12);
}

/**
 * Create an OctahedronGeometry with standard dimensions
 */
function createOctahedronGeometry(): THREE.OctahedronGeometry {
  return new THREE.OctahedronGeometry(0.25, 0);
}

/**
 * Create a PlaneGeometry with standard dimensions
 */
function createPlaneGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(0.9, 0.9);
}

/**
 * Create a BoxGeometry for grid tiles
 */
function createGridBoxGeometry(): THREE.BoxGeometry {
  return new THREE.BoxGeometry(0.9, 0.05, 0.9);
}

/**
 * Create a CylinderGeometry for grid tiles
 */
function createGridCylinderGeometry(): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
}

/**
 * Create a SphereGeometry for grid tiles (flattened)
 */
function createGridSphereGeometry(): THREE.SphereGeometry {
  return new THREE.SphereGeometry(0.4, 16, 8);
}

// ============================================================================
// Geometry Type to Factory Mapping
// ============================================================================

/**
 * Map geometry types to their factory functions for crystals/altar
 */
const crystalGeometryFactories: Record<GeometryType, () => THREE.BufferGeometry> = {
  box: createBoxGeometry,
  cylinder: createCylinderGeometry,
  sphere: createSphereGeometry,
  octahedron: createOctahedronGeometry,
  plane: createPlaneGeometry,
};

/**
 * Map geometry types to their factory functions for grid tiles
 */
const gridGeometryFactories: Record<GeometryType, () => THREE.BufferGeometry> = {
  box: createGridBoxGeometry,
  cylinder: createGridCylinderGeometry,
  sphere: createGridSphereGeometry,
  octahedron: createGridBoxGeometry, // Fallback to box for octahedron on grid
  plane: createPlaneGeometry,
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get a geometry instance for a specific element type and subject
 * Uses caching to avoid recreating geometries
 *
 * @param subjectId - The subject ID from the deck
 * @param elementType - Which element to get geometry for: 'crystal', 'altar', or 'gridTile'
 * @returns THREE.BufferGeometry for the requested element
 */
export function getGeometryForSubject(
  subjectId: string | null,
  elementType: 'crystal' | 'altar' | 'gridTile'
): THREE.BufferGeometry {
  // Generate cache key
  const cacheKey = `${subjectId || 'default'}-${elementType}`;

  // Check cache first
  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)!;
  }

  // Get subject geometry config
  const subjectGeometry = getSubjectGeometry(subjectId);

  // Get the geometry type based on element
  let geometryType: GeometryType;
  switch (elementType) {
    case 'crystal':
      geometryType = subjectGeometry.crystal;
      break;
    case 'altar':
      geometryType = subjectGeometry.altar;
      break;
    case 'gridTile':
    default:
      geometryType = subjectGeometry.gridTile;
      break;
  }

  // Get the appropriate factory
  const factories = elementType === 'gridTile' ? gridGeometryFactories : crystalGeometryFactories;
  const factory = factories[geometryType] || factories.box;

  // Create and cache the geometry
  const geometry = factory();
  geometryCache.set(cacheKey, geometry);

  return geometry;
}

/**
 * Get subject geometry configuration from deck data
 * Returns default geometry if subject not found
 *
 * @param subjectId - The subject ID from the deck
 * @returns SubjectGeometry configuration
 */
export function getSubjectGeometry(subjectId: string | null): SubjectGeometry {
  // Default geometry configuration
  const defaultGeometry: SubjectGeometry = {
    gridTile: 'box',
    crystal: 'box',
    altar: 'cylinder',
  };

  if (!subjectId) {
    return defaultGeometry;
  }

  try {
    const deck = getDeckSnapshot() as Deck;
    const subject = deck.subjects?.find((s: Subject) => s.id === subjectId);

    if (subject?.geometry) {
      return subject.geometry;
    }
  } catch (error) {
    console.warn(`Could not find geometry for subject: ${subjectId}`, error);
  }

  return defaultGeometry;
}

/**
 * Get subject color from deck data
 *
 * @param subjectId - The subject ID from the deck
 * @returns Hex color string or default color
 */
export function getSubjectColor(subjectId: string | null): string {
  if (!subjectId) {
    return '#6366f1'; // Default indigo
  }

  try {
    const deck = getDeckSnapshot() as Deck;
    const subject = deck.subjects?.find((s: Subject) => s.id === subjectId);

    if (subject?.color) {
      return subject.color;
    }
  } catch (error) {
    console.warn(`Could not find color for subject: ${subjectId}`, error);
  }

  return '#6366f1'; // Default indigo
}

/**
 * Minimal crystal color contract for visual consistency in 3D elements.
 */
export interface CrystalColors {
  /** Outer crystal surface color */
  outerColor: string;
  /** Inner core color */
  innerColor: string;
  /** Emissive glow color */
  emissiveColor: string;
}

/**
 * Get crystal colors for a subject.
 *
 * Keeps a compact surface area used by the renderer and exposes the
 * same dependency as the existing `getCrystalColors` utility.
 */
export function getCrystalColors(subjectId: string | null): CrystalColors {
  const color = getSubjectColor(subjectId);
  return {
    outerColor: color,
    innerColor: color,
    emissiveColor: color,
  };
}

/**
 * Get all subjects from deck data
 *
 * @returns Array of Subject objects
 */
export function getAllSubjects(): Subject[] {
  try {
    const deck = getDeckSnapshot() as Deck;
    return deck.subjects || [];
  } catch (error) {
    console.warn('Could not load subjects from deck', error);
    return [];
  }
}

/**
 * Clear the geometry cache
 * Useful for memory management or when themes change
 */
export function clearGeometryCache(): void {
  geometryCache.forEach((geometry) => {
    geometry.dispose();
  });
  geometryCache.clear();
}
