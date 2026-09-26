import { writeFileSync } from 'node:fs';
import { createDemoBoard } from '../lib/demo-board.ts';
const board=createDemoBoard();
const ref=(_ref:string)=>({_type:'reference',_ref});
const docs=[{_id:board.production.id,_type:'production',title:board.production.title,subtitle:board.production.subtitle,scenes:board.scenes.map(s=>({_key:s.id,...ref(s.id)}))},...board.props.map(p=>({_id:p.id,_type:'prop',name:p.name,category:p.category,production:ref(board.production.id)})),...board.scenes.map(s=>({_id:s.id,_type:'scene',title:s.title,setting:s.setting,production:ref(board.production.id),placements:s.placements.map(p=>({_key:p.id,_type:'placement',prop:ref(p.propId),location:p.location,...(p.cue?{cue:p.cue}:{})}))}))];
writeFileSync(new URL('../seed.ndjson',import.meta.url),docs.map(d=>JSON.stringify(d)).join('\n')+'\n');
console.log(`Wrote ${docs.length} fictional documents with no invented review records.`);
