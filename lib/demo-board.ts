import type { Board, Scene } from './types.ts';
const props=[
{id:'p01',name:'Brass counter bell',category:'Hand prop'},{id:'p02',name:'Office key ring',category:'Hand prop'},
{id:'p03',name:'Blue clipboard',category:'Paper'},{id:'p04',name:'Blunt pencil',category:'Hand prop'},
{id:'p05',name:'Folded tide chart',category:'Paper'},{id:'p06',name:'Red scarf',category:'Costume accessory'},
{id:'p07',name:'Canvas holdall',category:'Hand prop'},{id:'p08',name:'Battery torch',category:'Practical'},
{id:'p09',name:'Enamel mug',category:'Tableware'},{id:'p10',name:'Wrapped parcel',category:'Hand prop'},
{id:'p11',name:'Cream envelope',category:'Paper'},{id:'p12',name:'Paper ferry ticket',category:'Paper'}];
const snapshots=[
['CS','SL','CS','CS','CS','BACKSTAGE','BACKSTAGE','SL','SL','BACKSTAGE','CS','BACKSTAGE'],
['CS','SL','CS','CS','CS','SR','SR','CS','SL','SR','CS','SR'],
['CS','SL','SL','SL','CS','SR','SR','CS','SL','SR','CS','SR'],
['CS','SL','SL','SL','CS','SR','SR','CS','SL','SR','SR','CS'],
['CS','SL','SL','SL','CS','BACKSTAGE','BACKSTAGE','BACKSTAGE','SL','BACKSTAGE','BACKSTAGE','CS'],
['CS','CS','CS','CS','CS','BACKSTAGE','BACKSTAGE','SL','BACKSTAGE','BACKSTAGE','BACKSTAGE','CS']];
const titles=['Last shift','One more passenger','The lights dip','The departure call','Down to the boat','Your keys now'];
const settings=['The ferry office, just before dusk. Opening preset.','Mira arrives with a parcel. Record the positions for this scene.','A brief power cut. Len reaches for the torch.','The last crossing is called. Ada hands over the envelope.','Mira leaves with Len. The parcel and torch leave together.','Len returns with the torch. Ada hands over the keys.'];
const cues:Record<string,string>={
'2-p06':'Mira places her scarf on the bench at stage right on entering.',
'2-p07':'Mira puts the holdall under the bench at stage right on entering.',
'2-p08':'Len brings the torch from stage left to the centre counter before the scene.',
'2-p10':'Mira brings the parcel from backstage to the right table on entering.',
'2-p12':'Mira enters stage right with the ferry ticket in her pocket.',
'3-p03':'Ada moves the clipboard from the counter to the left shelf before opening the chart.',
'3-p04':'Ada moves the pencil with the clipboard to the left shelf.',
'4-p11':'Ada gives the envelope to Mira at stage right on the departure call.',
'4-p12':'Mira gives the ticket to Ada, who leaves it beside the centre bell.',
'5-p06':'Mira puts on the scarf and exits right to backstage.',
'5-p07':'Mira picks up the holdall and exits right to backstage.',
'5-p08':'Len carries the torch offstage right. He keeps it for the return.',
'5-p10':'Len carries the parcel offstage right, then gives it to Mira on “I’ll take it from here.”',
'5-p11':'The envelope stays in Mira’s coat as she exits to backstage.',
'6-p02':'Ada gives the keys to Len at centre on “Your keys now.”',
'6-p03':'Len replaces the clipboard on the centre counter before the final scene.',
'6-p04':'Len returns the pencil with the clipboard to the centre counter.',
'6-p08':'Len returns with the torch and replaces it on the stage-left hook.',
'6-p09':'Ada picks up the mug from the left shelf and exits left to backstage.'};
export function createCleanDemoBoard():Board {
const scenes:Scene[]=snapshots.map((positions,i)=>({id:`scene-${i+1}`,number:i+1,title:titles[i],setting:settings[i],revision:'demo-1',placements:positions.map((location,j)=>({id:`s${i+1}-${props[j].id}`,propId:props[j].id,location,...(cues[`${i+1}-${props[j].id}`]?{cue:cues[`${i+1}-${props[j].id}`]}:{})}))}));
return {production:{id:'production-last-boat',title:'A Place on the Last Boat',subtitle:'A fictional one-act play · Ferry office · Six scene presets'},props:structuredClone(props),scenes};
}
export function createDemoBoard():Board {
const board=createCleanDemoBoard();board.scenes[1].placements.find(p=>p.propId==='p08')!.cue='';
board.scenes[1].placements.push({id:'s2-parcel-duplicate',propId:'p10',location:'SL'});
board.scenes[2].placements.find(p=>p.propId==='p10')!.cue='Mira leaves the parcel on the stage-right table for this scene.';
return board;
}
export const demoBoard=createDemoBoard();
