import type { Board } from '../lib/types.ts';

/** Entirely fictional demo production. No real person's approval is represented. */
export function createCleanBoard(): Board {
  return {
    production: { id: 'midnight-platform', title: 'The Midnight Platform', subtitle: 'A fictional six-scene rehearsal plan' },
    props: [
      { id: 'key', name: 'Brass key', category: 'Hand prop' },
      { id: 'cup', name: 'Blue teacup', category: 'Tableware' },
      { id: 'ledger', name: 'Station ledger', category: 'Paper' },
      { id: 'lantern', name: 'Signal lantern', category: 'Practical' },
      { id: 'scarf', name: 'Red scarf', category: 'Costume accessory' },
      { id: 'letter', name: 'Sealed letter', category: 'Paper' },
    ],
    scenes: [
      { id: 'arrival', number: 1, title: 'The last arrival', setting: 'An empty station', revision: '1', placements: [
        { id: 'key', propId: 'key', location: 'SL' },
        { id: 'cup', propId: 'cup', location: 'CS' },
        { id: 'ledger', propId: 'ledger', location: 'BACKSTAGE' },
      ] },
      { id: 'office', number: 2, title: 'The locked office', setting: 'The ticket desk', revision: '1', placements: [
        { id: 'key', propId: 'key', location: 'CS', cue: 'In the blackout, move the brass key from SL to the centre desk.' },
        { id: 'cup', propId: 'cup', location: 'CS' },
      ] },
      { id: 'signal', number: 3, title: 'A signal in the fog', setting: 'The platform', revision: '1', placements: [
        { id: 'key', propId: 'key', location: 'CS' },
        { id: 'lantern', propId: 'lantern', location: 'SR' },
        { id: 'ledger', propId: 'ledger', location: 'CS', cue: 'Bring the station ledger from backstage to the centre desk.' },
      ] },
      { id: 'visitor', number: 4, title: 'The visitor', setting: 'The waiting room', revision: '1', placements: [
        { id: 'key', propId: 'key', location: 'CS' },
        { id: 'scarf', propId: 'scarf', location: 'SL' },
      ] },
      { id: 'departure', number: 5, title: 'An unlisted departure', setting: 'The platform steps', revision: '1', placements: [
        { id: 'key', propId: 'key', location: 'SL', cue: 'Move the brass key from the centre desk to SL before the lights rise.' },
        { id: 'lantern', propId: 'lantern', location: 'CS', cue: 'Move the signal lantern from SR to CS during the scene change.' },
      ] },
      { id: 'morning', number: 6, title: 'What morning leaves', setting: 'The station at dawn', revision: '1', placements: [
        { id: 'key', propId: 'key', location: 'SL' },
        { id: 'scarf', propId: 'scarf', location: 'SR', cue: 'Carry the red scarf from SL to SR during the final blackout.' },
        { id: 'letter', propId: 'letter', location: 'CS' },
      ] },
    ],
  };
}

/** Two fixable scene-2 findings. Start with no claimed human review. */
export function createDemoBoard(): Board {
  const board = createCleanBoard();
  board.scenes[1].placements[0].cue = '';
  board.scenes[1].placements.push({ id: 'cup-copy', propId: 'cup', location: 'SR' });
  return board;
}

/** Clone this initial state before editing it. */
export const demoBoard = createDemoBoard();
