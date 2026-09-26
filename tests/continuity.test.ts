import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, createSceneReview, reviewStatus, sceneFingerprint } from '../lib/continuity.ts';
import { createCleanBoard, createDemoBoard } from './reference-board.ts';

const reviewer = { reviewer: 'Test reviewer', reviewedAt: '2026-09-26T12:00:00.000Z' };

test('clean six-scene production and first appearances need no transfer', () => {
  assert.deepEqual(analyze(createCleanBoard()), []);
});

test('demo has exactly two actionable issues in scene 2', () => {
  assert.deepEqual(analyze(createDemoBoard()).map(({ sceneId, kind }) => [sceneId, kind]), [
    ['office', 'missing-transfer'], ['office', 'duplicate'],
  ]);
});

test('a prop absent for several scenes still needs a transfer on its next appearance', () => {
  const board = createCleanBoard();
  board.scenes[5].placements.find((item) => item.propId === 'scarf')!.cue = '  \n ';
  const problems = analyze(board);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, 'missing-transfer');
  assert.match(problems[0].message, /scene 4/);
});

test('same-location repeated placement is still one physical prop listed twice', () => {
  const board = createCleanBoard();
  board.scenes[0].placements.push({ id: 'cup-copy', propId: 'cup', location: 'CS' });
  assert.deepEqual(analyze(board).map((item) => item.kind), ['duplicate']);
});

test('an ambiguous previous appearance cannot silently choose one of its locations', () => {
  const board = createCleanBoard();
  board.scenes[3].placements.push({ id: 'key-copy', propId: 'key', location: 'SL' });
  board.scenes[4].placements[0].cue = '';
  assert.deepEqual(analyze(board).map(({ sceneId, kind }) => [sceneId, kind]), [
    ['visitor', 'duplicate'], ['departure', 'missing-transfer'],
  ]);
});

test('missing incoming cue does not fabricate repeated physical-position errors', () => {
  const board = createCleanBoard();
  board.scenes[1].placements[0].cue = '';
  assert.deepEqual(analyze(board).map((item) => item.sceneId), ['office']);
});

test('an earlier relevant cue edit invalidates a later approval even when both plans are clean', () => {
  const board = createCleanBoard();
  board.scenes[5].review = createSceneReview(board, 'morning', reviewer);
  board.scenes[1].placements[0].cue += ' Use the left corridor.';
  assert.equal(reviewStatus(board, 'morning'), 'stale');
});

test('earlier relevant placement deletion invalidates the downstream review', () => {
  const board = createCleanBoard();
  board.scenes[5].review = createSceneReview(board, 'morning', reviewer);
  board.scenes[3].placements = board.scenes[3].placements.filter((item) => item.propId !== 'key');
  assert.equal(reviewStatus(board, 'morning'), 'stale');
});

test('future edits and unrelated prop edits do not invalidate an earlier approval', () => {
  const board = createCleanBoard();
  board.scenes[1].review = createSceneReview(board, 'office', reviewer);
  board.scenes[5].title = 'A revised ending';
  board.props.find((prop) => prop.id === 'lantern')!.name = 'Amber signal lantern';
  board.scenes[0].placements.find((item) => item.propId === 'ledger')!.location = 'SR';
  assert.equal(reviewStatus(board, 'office'), 'current');
});

test('renaming a prop used by the reviewed scene invalidates its approval', () => {
  const board = createCleanBoard();
  board.scenes[1].review = createSceneReview(board, 'office', reviewer);
  board.props.find((prop) => prop.id === 'key')!.name = 'Silver key';
  assert.equal(reviewStatus(board, 'office'), 'stale');
});

test('review fields, object-property ordering, and row reorder do not change fingerprint', () => {
  const board = createCleanBoard();
  const before = sceneFingerprint(board, 'office');
  board.scenes[1].placements.reverse();
  board.scenes[0].placements.reverse();
  board.scenes[1].review = createSceneReview(board, 'office', reviewer);
  assert.equal(sceneFingerprint(board, 'office'), before);
  assert.equal(reviewStatus(board, 'office'), 'current');
});

test('stale review can be refreshed; unresolved continuity problems cannot', () => {
  const board = createCleanBoard();
  board.scenes[1].review = createSceneReview(board, 'office', reviewer);
  board.scenes[1].revision = '2';
  assert.equal(reviewStatus(board, 'office'), 'stale');
  board.scenes[1].review = createSceneReview(board, 'office', reviewer);
  assert.equal(reviewStatus(board, 'office'), 'current');
  board.scenes[1].placements[0].cue = '';
  assert.equal(reviewStatus(board, 'office'), 'blocked');
  assert.throws(() => createSceneReview(board, 'office', reviewer), /Resolve/);
});

test('identities, references, locations and chronology reject malformed imports', () => {
  const unknown = createCleanBoard();
  unknown.scenes[0].placements[0].propId = 'not-in-inventory';
  assert.throws(() => analyze(unknown), /Unknown prop/);
  const location = createCleanBoard();
  location.scenes[0].placements[0].location = 'front';
  assert.throws(() => analyze(location), /Unknown location/);
  const order = createCleanBoard();
  order.scenes.reverse();
  assert.throws(() => analyze(order), /Scene numbers/);
  const duplicate = createCleanBoard();
  duplicate.scenes[0].placements.push({ ...duplicate.scenes[0].placements[0] });
  assert.throws(() => analyze(duplicate), /Duplicate placement id/);
});

test('analysis and review-token creation leave their input untouched', () => {
  const board = createDemoBoard();
  const snapshot = JSON.stringify(board);
  analyze(board);
  sceneFingerprint(board, 'morning');
  createSceneReview(board, 'morning', reviewer);
  assert.equal(JSON.stringify(board), snapshot);
});
