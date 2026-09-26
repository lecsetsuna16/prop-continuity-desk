import { assertBoard } from './continuity.ts';
import type { Board } from './types.ts';
export const API_VERSION='2026-09-26';
export const BOARD_QUERY=`*[_type == "production" && _id == $productionId][0]{
"production":{"id":_id,title,subtitle},
"props":*[_type == "prop" && production._ref == ^._id]{"id":_id,name,category},
"scenes":scenes[]->{"id":_id,title,setting,"revision":_rev,
"placements":placements[]{"id":_key,"propId":prop._ref,location,cue},
"review":*[_type=="sceneReview" && scene._ref == ^._id] | order(_createdAt desc)[0]{fingerprint,reviewer,reviewedAt}}
}`;
export function parseBoard(value:unknown):Board {
if(!value||typeof value!=='object')throw new Error('No published production found. Publish the production, props and scenes in Studio.');
const b=value as Board;
if(!b.production||typeof b.production.id!=='string'||typeof b.production.title!=='string'||typeof b.production.subtitle!=='string'||!Array.isArray(b.props)||!Array.isArray(b.scenes)||!b.scenes.length)throw new Error('The published production is missing required fields.');
for(const p of b.props)if(!p||typeof p.name!=='string'||typeof p.category!=='string')throw new Error('A prop is missing required fields.');
b.scenes=b.scenes.map((s,i)=>{
if(!s||typeof s.title!=='string'||typeof s.setting!=='string'||!Array.isArray(s.placements))throw new Error('A scene is unpublished or incomplete.');
if(s.placements.some(p=>!p||typeof p!=='object'))throw new Error('A placement is incomplete.');
if(s.review&&(typeof s.review.fingerprint!=='string'||typeof s.review.reviewer!=='string'||typeof s.review.reviewedAt!=='string'||!s.review.reviewer.trim()||!Number.isFinite(Date.parse(s.review.reviewedAt))))throw new Error('A saved review is incomplete.');
return {...s,number:i+1,placements:s.placements.map(p=>({...p,...(p.cue===null?{cue:undefined}:{})}))};});
assertBoard(b);return b;
}
