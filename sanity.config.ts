import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './studio/schema';
import { ReviewDesk } from './studio/ReviewDesk';
const projectId=process.env.SANITY_STUDIO_PROJECT_ID;
if(!projectId)throw new Error('Set SANITY_STUDIO_PROJECT_ID to your own Sanity project ID before starting Studio.');
export default defineConfig({name:'prop-continuity',title:'Prop Continuity Desk',projectId,dataset:process.env.SANITY_STUDIO_DATASET||'production',plugins:[structureTool({title:'Content'}),{name:'plan-review',tools:[{name:'plan-review',title:'Plan review',component:ReviewDesk}]}],schema:{types:schemaTypes},document:{actions:(previous,context)=>context.schemaType==='sceneReview'?[]:previous,newDocumentOptions:(previous)=>previous.filter(item=>item.templateId!=='sceneReview')}});
