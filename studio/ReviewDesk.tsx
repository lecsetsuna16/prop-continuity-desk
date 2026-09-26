import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient, useWorkspace } from 'sanity';
import { analyze, createSceneReview, fingerprintScene, reviewStatus } from '../lib/continuity';
import { BOARD_QUERY, API_VERSION, parseBoard } from '../lib/board-data';
import type { Board } from '../lib/types';

const productionId=process.env.SANITY_STUDIO_PRODUCTION_ID || 'production-last-boat';
const panel:React.CSSProperties={padding:28,maxWidth:1100,margin:'0 auto',fontFamily:'system-ui',lineHeight:1.6};
const button:React.CSSProperties={padding:'10px 16px',font:'inherit',border:'1px solid #8eac96',borderRadius:5,cursor:'pointer',marginRight:12};

/** Authenticated editors check an explicitly displayed published snapshot. */
export function ReviewDesk(){
  const baseClient=useClient({apiVersion:API_VERSION});
  const client=useMemo(()=>baseClient.withConfig({useCdn:false,perspective:'published'}),[baseClient]);
  const {currentUser}=useWorkspace();
  const [board,setBoard]=useState<Board|null>(null);
  const [sceneId,setSceneId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const load=useCallback(async()=>{
    setBusy(true);setMessage('');
    try{const b=parseBoard(await client.fetch(BOARD_QUERY,{productionId}));setBoard(b);setSceneId(previous=>b.scenes.some(s=>s.id===previous)?previous:b.scenes[0].id);}
    catch(e){setMessage(e instanceof Error?e.message:'Could not load published plan.');}
    finally{setBusy(false);}
  },[client]);
  useEffect(()=>{void load();},[load]);
  const scene=board?.scenes.find(s=>s.id===sceneId);
  const findings=board?analyze(board).filter(f=>f.sceneId===sceneId):[];
  const blockers=findings.filter(f=>f.kind!=='stale-review');
  const current=board&&scene&&reviewStatus(board,sceneId)==='current';
  async function approve(){
    if(!board||!scene||!currentUser||busy||blockers.length)return;
    setBusy(true);setMessage('');
    try{
      const displayedFingerprint=fingerprintScene(board,sceneId);
      const fresh=parseBoard(await client.fetch(BOARD_QUERY,{productionId}));
      if(fingerprintScene(fresh,sceneId)!==displayedFingerprint){setBoard(fresh);throw new Error('The plan changed while you were reviewing it. Read the refreshed content before checking it.');}
      const review=createSceneReview(board,sceneId,{reviewer:'Production editor',reviewedAt:new Date().toISOString()});
      // Each explicit check is a new event, even when earlier content is restored.
      const id='review-'+crypto.randomUUID();
      await client.create({_id:id,_type:'sceneReview',scene:{_type:'reference',_ref:sceneId},production:{_type:'reference',_ref:board.production.id},sourceRevision:scene.revision,...review},{visibility:'sync'});
      const after=parseBoard(await client.fetch(BOARD_QUERY,{productionId}));setBoard(after);
      setMessage(reviewStatus(after,sceneId)==='current'?'This published plan is checked.':'Your snapshot was recorded, but the current plan still needs another review. Reload before deciding again.');
    }catch(e){setMessage(e instanceof Error?e.message:'The check could not be saved. Reload before trying again.');}
    finally{setBusy(false);}
  }
  return <div style={panel}><h1>Plan review desk</h1><p>Review the published scene and its earlier prop positions. Checks are records of a plan review, not confirmation of a physical preset. Publish content edits in the Content tab first.</p><button style={button} disabled={busy} onClick={()=>void load()}>Reload published plan</button>{message&&<p role="status" style={{border:'1px solid #c4ac60',padding:16}}>{message}</p>}{!board?<p>Waiting for a published production…</p>:<><h2>{board.production.title}</h2><label>Scene <select style={{font:'inherit',padding:8}} disabled={busy} value={sceneId} onChange={e=>{setSceneId(e.target.value);setMessage('');}}>{board.scenes.map(s=><option key={s.id} value={s.id}>{s.number}. {s.title}</option>)}</select></label>{scene&&<><h2>{scene.title}</h2><p>{scene.setting}</p><p><strong>{current?'Plan checked':scene.review?'Needs recheck':'Not checked'}</strong> · Published revision {scene.revision}</p>{findings.map(f=><p key={f.id} style={{background:'#fff2d4',color:'#543f15',padding:12}}>{f.message}</p>)}<table style={{borderCollapse:'collapse',width:'100%'}}><caption style={{textAlign:'left'}}>Current scene and incoming history</caption><thead><tr><th align="left">Prop</th><th align="left">Earlier recorded positions</th><th align="left">This scene</th><th align="left">Transfer cue</th></tr></thead><tbody>{scene.placements.map(p=><tr key={p.id}><td style={{padding:12,borderBottom:'1px solid #ccc'}}>{board.props.find(item=>item.id===p.propId)?.name}</td><td style={{padding:12,borderBottom:'1px solid #ccc'}}>{board.scenes.slice(0,scene.number-1).flatMap(s=>s.placements.filter(item=>item.propId===p.propId).map(item=>`Scene ${s.number}: ${item.location}${item.cue?` (${item.cue})`:''}`)).join(' → ')||'First recorded appearance'}</td><td style={{padding:12,borderBottom:'1px solid #ccc'}}>{p.location}</td><td style={{padding:12,borderBottom:'1px solid #ccc'}}>{p.cue||'None recorded'}</td></tr>)}</tbody></table><p>Only the exact displayed content and relevant history are checked. A concurrent later change leaves this record historical.</p><button style={{...button,background:'#214d3c',color:'white'}} disabled={busy||blockers.length>0||!!current||!currentUser} onClick={()=>void approve()}>{busy?'Checking current content…':current?'Current plan checked':'Mark displayed plan checked'}</button></>}</>}</div>;
}
