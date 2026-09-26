import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCleanDemoBoard,createDemoBoard} from '../lib/demo-board.ts';
import {analyze,createSceneReview,reviewStatus} from '../lib/continuity.ts';
import {parseBoard,BOARD_QUERY} from '../lib/sanity.ts';
import {parse,evaluate} from 'groq-js';

test('public sample has twelve props and exactly two scene-2 findings',()=>{const b=createDemoBoard();assert.equal(b.props.length,12);assert.equal(b.scenes.length,6);assert.deepEqual(analyze(b).map(f=>[f.sceneId,f.kind]),[['scene-2','missing-transfer'],['scene-2','duplicate']]);});
test('sample repairs allow review and a later cue edit expires it',()=>{const b=createCleanDemoBoard();assert.deepEqual(analyze(b),[]);b.scenes[1].review=createSceneReview(b,'scene-2',{reviewer:'Tester',reviewedAt:'2026-09-26T13:00:00Z'});b.scenes[1].placements[7].cue+=' Carry it with both hands.';assert.equal(reviewStatus(b,'scene-2'),'stale');});
test('GROQ returns ordered published scenes, props and latest independent review',async()=>{
const b=createCleanDemoBoard();const ref=(_ref:string)=>({_type:'reference',_ref});
const docs:Record<string,unknown>[]=[{_id:b.production.id,_type:'production',title:b.production.title,subtitle:b.production.subtitle,scenes:b.scenes.map(s=>ref(s.id))},...b.props.map(p=>({_id:p.id,_type:'prop',name:p.name,category:p.category,production:ref(b.production.id)})),...b.scenes.map(s=>({_id:s.id,_type:'scene',_rev:s.revision,title:s.title,setting:s.setting,placements:s.placements.map(p=>({_key:p.id,prop:ref(p.propId),location:p.location,cue:p.cue??null}))})),{_id:'review-one',_type:'sceneReview',_createdAt:'2026-09-26T13:00:00Z',scene:ref('scene-2'),...createSceneReview(b,'scene-2',{reviewer:'Tester',reviewedAt:'2026-09-26T13:00:00Z'})}];
const result=await(await evaluate(parse(BOARD_QUERY),{dataset:docs,params:{productionId:b.production.id}})).get();
const actual=parseBoard(result);assert.equal(actual.scenes.length,6);assert.equal(actual.props.length,12);assert.equal(actual.scenes[1].review?.reviewer,'Tester');assert.equal(reviewStatus(actual,'scene-2'),'current');
const first=docs[docs.length-1];
docs.push({...first,_id:'review-two',_createdAt:'2026-09-26T13:01:00Z',fingerprint:'an-intervening-different-plan'});
const stale=parseBoard(await(await evaluate(parse(BOARD_QUERY),{dataset:docs,params:{productionId:b.production.id}})).get());
assert.equal(reviewStatus(stale,'scene-2'),'stale');
docs.push({...first,_id:'review-three',_createdAt:'2026-09-26T13:02:00Z'});
const restored=parseBoard(await(await evaluate(parse(BOARD_QUERY),{dataset:docs,params:{productionId:b.production.id}})).get());
assert.equal(reviewStatus(restored,'scene-2'),'current');
});
test('an unpublished scene or missing production fails visibly instead of falling back',()=>{assert.throws(()=>parseBoard(null),/No published/);const b=createCleanDemoBoard();(b.scenes as unknown[])[0]=null;assert.throws(()=>parseBoard(b),/unpublished/);});
test('blank reviewer and invalid review timestamp are rejected at the public boundary',()=>{const b=createCleanDemoBoard();b.scenes[1].review=createSceneReview(b,'scene-2',{reviewer:'Tester',reviewedAt:'2026-09-26T13:00:00Z'});b.scenes[1].review.reviewer=' ';assert.throws(()=>parseBoard(b),/review is incomplete/);b.scenes[1].review.reviewer='Tester';b.scenes[1].review.reviewedAt='not-a-date';assert.throws(()=>parseBoard(b),/review is incomplete/);});
