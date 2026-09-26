/** Reference contract. Array order is scene chronology; number must be index + 1. */
export const LOCATIONS = ['SL', 'CS', 'SR', 'BACKSTAGE'] as const;
export type Location = (typeof LOCATIONS)[number];

export interface Placement {
  id: string;
  propId: string;
  location: string;
  /** A human-readable transfer instruction, performed before this scene begins. */
  cue?: string;
}

export interface SceneReview {
  fingerprint: string;
  reviewedAt: string;
  reviewer: string;
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  setting: string;
  /** Application revision, not Sanity's document-level _rev. */
  revision: string;
  placements: Placement[];
  review?: SceneReview;
}

export interface Board {
  production: { id: string; title: string; subtitle: string };
  props: { id: string; name: string; category: string }[];
  scenes: Scene[];
}

export interface Finding {
  id: string;
  sceneId: string;
  propId?: string;
  kind: 'duplicate' | 'missing-transfer' | 'stale-review';
  message: string;
}
