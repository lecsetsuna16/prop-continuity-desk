import { createClient } from '@sanity/client';
import type { Board } from './types.ts';
import {API_VERSION,BOARD_QUERY,parseBoard} from './board-data.ts';
export {API_VERSION,BOARD_QUERY,parseBoard} from './board-data.ts';
export const projectId=process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '';
export const dataset=process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
export const productionId=process.env.NEXT_PUBLIC_SANITY_PRODUCTION_ID ?? 'production-last-boat';
export const studioUrl=process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? '';
export const sanityConfigured=!!projectId;
export async function loadBoard():Promise<Board>{
if(!projectId)throw new Error('A Sanity project has not been connected yet.');
if(!/^[a-z0-9-]+$/.test(projectId)||!/^[-\w]+$/.test(dataset))throw new Error('Invalid Sanity configuration.');
const client=createClient({projectId,dataset,apiVersion:API_VERSION,useCdn:false,perspective:'published'});
return parseBoard(await client.fetch(BOARD_QUERY,{productionId}));
}
