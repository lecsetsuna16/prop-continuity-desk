import { LOCATIONS } from './types.ts';
import type { Board, Finding, Placement, Scene, SceneReview } from './types.ts';
export type { Board, Finding, Placement, Scene, SceneReview } from './types.ts';

function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be nonempty text.`);
}

/** Malformed input is separate from the three editorial findings. Validate at import too. */
export function assertBoard(board: Board): void {
  requireText(board.production.id, 'Production id');
  const props = new Set<string>();
  for (const prop of board.props) {
    requireText(prop.id, 'Prop id');
    requireText(prop.name, 'Prop name');
    if (props.has(prop.id)) throw new Error(`Duplicate prop id: ${prop.id}`);
    props.add(prop.id);
  }
  const scenes = new Set<string>();
  board.scenes.forEach((scene, index) => {
    requireText(scene.id, 'Scene id');
    requireText(scene.revision, 'Scene revision');
    if (scenes.has(scene.id)) throw new Error(`Duplicate scene id: ${scene.id}`);
    scenes.add(scene.id);
    if (scene.number !== index + 1) throw new Error('Scene numbers must match array order, starting at 1.');
    const placements = new Set<string>();
    for (const placement of scene.placements) {
      requireText(placement.id, 'Placement id');
      if (placements.has(placement.id)) throw new Error(`Duplicate placement id in ${scene.id}: ${placement.id}`);
      placements.add(placement.id);
      if (!props.has(placement.propId)) throw new Error(`Unknown prop: ${placement.propId}`);
      if (!(LOCATIONS as readonly string[]).includes(placement.location)) {
        throw new Error(`Unknown location: ${placement.location}`);
      }
      if (placement.cue !== undefined && typeof placement.cue !== 'string') throw new Error('Cue must be text.');
    }
  });
}

function getScene(board: Board, sceneId: string): { scene: Scene; index: number } {
  const index = board.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) throw new Error(`Unknown scene: ${sceneId}`);
  return { scene: board.scenes[index], index };
}

function normalizedPlacements(placements: Placement[]) {
  // Reordering rows is not an operational edit. Names/keys are serialized explicitly.
  return placements.map(({ id, propId, location, cue }) => ({
    id, propId, location, cue: cue?.trim() ?? '',
  })).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

function fingerprintUnchecked(board: Board, sceneId: string): string {
  const { scene, index } = getScene(board, sceneId);
  const relevant = new Set(scene.placements.map((placement) => placement.propId));
  const props = board.props.filter((prop) => relevant.has(prop.id))
    .map(({ id, name, category }) => ({ id, name, category }))
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const history = board.scenes.slice(0, index).map((prior) => ({
    id: prior.id,
    number: prior.number,
    placements: normalizedPlacements(prior.placements.filter((item) => relevant.has(item.propId))),
  })).filter((prior) => prior.placements.length > 0);
  // An exact canonical representation avoids hash collisions and needs no crypto/runtime
  // dependency. It is a change token, NOT an authentication signature. Six-scene plans
  // keep it small. A production adapter may store a SHA-256 digest of this exact string.
  return `continuity-v1:${JSON.stringify({
    productionId: board.production.id,
    scene: {
      id: scene.id, number: scene.number, title: scene.title,
      setting: scene.setting, revision: scene.revision,
      placements: normalizedPlacements(scene.placements),
    },
    props,
    history,
  })}`;
}

export function sceneFingerprint(board: Board, sceneId: string): string {
  assertBoard(board);
  return fingerprintUnchecked(board, sceneId);
}

/** UI contract name; keep the longer spelling as a reference-test convenience. */
export const fingerprintScene = sceneFingerprint;

function finding(kind: Finding['kind'], scene: Scene, message: string, propId?: string): Finding {
  return {
    id: `${kind}:${encodeURIComponent(scene.id)}:${encodeURIComponent(propId ?? '')}`,
    sceneId: scene.id, ...(propId ? { propId } : {}), kind, message,
  };
}

/**
 * Checks planned placements, not physical custody. A cue is a declared instruction;
 * its prose is never interpreted as proof that somebody actually moved a prop.
 * First appearance is preset. A missing scene does not reset the last appearance.
 */
export function analyze(board: Board): Finding[] {
  assertBoard(board);
  const result: Finding[] = [];
  const names = new Map(board.props.map((prop) => [prop.id, prop.name]));
  const previous = new Map<string, { scene: Scene; locations: Set<string> }>();

  for (const scene of board.scenes) {
    const groups = new Map<string, Placement[]>();
    for (const placement of scene.placements) {
      const group = groups.get(placement.propId) ?? [];
      group.push(placement);
      groups.set(placement.propId, group);
    }
    for (const [propId, placements] of groups) {
      const name = names.get(propId)!;
      const locations = new Set(placements.map((placement) => placement.location));
      if (placements.length > 1) {
        result.push(finding('duplicate', scene,
          `${name} has ${placements.length} placements in scene ${scene.number}. Keep one placement for this physical prop.`, propId));
      } else {
        const placement = placements[0];
        const prior = previous.get(propId);
        if (prior) {
          const ambiguous = prior.locations.size > 1;
          const moved = ambiguous || !prior.locations.has(placement.location);
          if (moved && !placement.cue?.trim()) {
            result.push(finding('missing-transfer', scene, ambiguous
              ? `${name}'s last appearance in scene ${prior.scene.number} has conflicting locations. Resolve that conflict and add a transfer cue into ${placement.location}.`
              : `${name} was last placed at ${[...prior.locations][0]} in scene ${prior.scene.number}. Add a transfer cue into ${placement.location} before scene ${scene.number}.`, propId));
          }
        }
      }
      // Keep the planned destination even if its incoming instruction is absent. This
      // reports the missing link once, not an invented cascade of physical positions.
      previous.set(propId, { scene, locations });
    }
    if (scene.review && scene.review.fingerprint !== fingerprintUnchecked(board, scene.id)) {
      result.push(finding('stale-review', scene,
        `Scene ${scene.number} or its prop history changed after review. Check the updated plan and review it again.`));
    }
  }
  return result;
}

/** Call from an explicit review action. Staleness can be repaired; real conflicts cannot. */
export function createSceneReview(
  board: Board,
  sceneId: string,
  input: { reviewer: string; reviewedAt: string },
): SceneReview {
  const blockers = analyze(board).filter((item) => item.sceneId === sceneId && item.kind !== 'stale-review');
  if (blockers.length) throw new Error(`Resolve this scene's continuity findings before reviewing it: ${blockers.map((item) => item.kind).join(', ')}`);
  requireText(input.reviewer, 'Reviewer');
  if (!Number.isFinite(Date.parse(input.reviewedAt))) throw new Error('Review timestamp must be a valid date.');
  return {
    fingerprint: sceneFingerprint(board, sceneId),
    reviewer: input.reviewer.trim(), reviewedAt: input.reviewedAt,
  };
}

export function reviewStatus(board: Board, sceneId: string): 'unreviewed' | 'current' | 'stale' | 'blocked' {
  const findings = analyze(board).filter((item) => item.sceneId === sceneId);
  if (findings.some((item) => item.kind !== 'stale-review')) return 'blocked';
  const { scene } = getScene(board, sceneId);
  if (!scene.review) return 'unreviewed';
  return findings.some((item) => item.kind === 'stale-review') ? 'stale' : 'current';
}
