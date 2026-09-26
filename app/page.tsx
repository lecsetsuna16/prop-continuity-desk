'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { analyze, fingerprintScene, reviewStatus } from '../lib/continuity';
import type { Board, Scene } from '../lib/types';
import { demoBoard } from '../lib/demo-board';
import { loadBoard, sanityConfigured, studioUrl } from '../lib/sanity';

const zones = [{id:'SL',name:'Stage left',short:'SL'},{id:'CS',name:'Centre stage',short:'CS'},{id:'SR',name:'Stage right',short:'SR'},{id:'BACKSTAGE',name:'Backstage',short:'OFF'}];
const locationName = (id:string) => zones.find(z=>z.id===id)?.name ?? id;
const clone = (board:Board):Board => structuredClone(board);

export default function Desk() {
  const [board,setBoard] = useState<Board>(()=>clone(demoBoard));
  const [sceneId,setSceneId] = useState(demoBoard.scenes[1].id);
  const [selectedPlacement,setSelectedPlacement] = useState<string|null>(null);
  const [mode,setMode] = useState<'demo'|'live'|'practice'>('demo');
  const [loading,setLoading] = useState(sanityConfigured);
  const [error,setError] = useState('');
  const requestSerial=useRef(0);
  const [notice,setNotice] = useState('');
  const [showCues,setShowCues] = useState(false);
  const [cueText,setCueText] = useState('');
  const [editingCue,setEditingCue] = useState<string|null>(null);
  const findings = useMemo(()=>analyze(board),[board]);
  const scene = board.scenes.find(s=>s.id===sceneId) ?? board.scenes[0];
  const sceneFindings = findings.filter(f=>f.sceneId===scene.id);
  const conflicts = sceneFindings.filter(f=>f.kind!=='stale-review');
  const isStale = sceneFindings.some(f=>f.kind==='stale-review');
  const checked = reviewStatus(board,scene.id)==='current';
  const selected = scene.placements.find(p=>p.id===selectedPlacement);
  const propName = (id:string) => board.props.find(p=>p.id===id)?.name ?? 'Unknown prop';
  const issueCount = findings.filter(f=>f.kind!=='stale-review').length;
  const checkedCount = board.scenes.filter(s=>reviewStatus(board,s.id)==='current').length;
  const editable = mode!=='live';
  const sceneIndex = board.scenes.findIndex(s=>s.id===scene.id);

  async function refresh() {
    const serial=++requestSerial.current; setLoading(true); setError('');
    try { const loaded=await loadBoard(); if(serial!==requestSerial.current)return; setBoard(loaded); setSceneId(loaded.scenes[0].id); setMode('live'); setNotice('Latest published plan loaded.'); }
    catch(e) { if(serial===requestSerial.current)setError(e instanceof Error?e.message:'Could not load the rehearsal plan.'); }
    finally { if(serial===requestSerial.current)setLoading(false); }
  }
  useEffect(()=>{ if(sanityConfigured) void refresh(); },[]);
  useEffect(()=>{setSelectedPlacement(null);setEditingCue(null);setNotice('');},[sceneId]);

  function editScene(update:(s:Scene)=>Scene) {
    if(!editable) return;
    setBoard(previous=>({...previous,scenes:previous.scenes.map(s=>s.id===scene.id?{...update(s),revision:crypto.randomUUID()}:s)}));
    setNotice('Practice copy updated. Affected checks need a fresh review.');
  }
  function approve() {
    if(!editable || conflicts.length) return;
    setBoard(previous=>({...previous,scenes:previous.scenes.map(s=>s.id===scene.id?{...s,review:{fingerprint:fingerprintScene(previous,s.id),reviewedAt:new Date().toISOString(),reviewer:'Practice reviewer'}}:s)}));
    setNotice('This version of the plan is checked in your practice copy.');
  }
  function exportCues() {
    if(loading)return;
    const lines=[`${board.production.title} — prop cue sheet`,`${mode==='live'?'Published plan':'PRACTICE COPY — not saved to the production'}`, 'A planning aid, not confirmation that physical props are in place.', ''];
    for(const s of board.scenes) {
      lines.push(`SCENE ${s.number}: ${s.title}`, s.setting);
      for(const p of s.placements) lines.push(`  ${propName(p.propId)} | ${locationName(p.location)}${p.cue?` | ${p.cue}`:''}`);
      for(const f of findings.filter(f=>f.sceneId===s.id)) lines.push(`  CHECK: ${f.message}`);
      const status=reviewStatus(board,s.id)==='current'?'Plan checked':s.review?'Needs recheck':'Not checked';
      lines.push(`  Review: ${status}`, '');
    }
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const anchor=document.createElement('a'); anchor.href=url; anchor.download='prop-cue-sheet.txt'; anchor.click(); URL.revokeObjectURL(url);
    setNotice('Cue sheet exported with current checks and practice status.');
  }

  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;
    if(!context?.registerTool) return;
    const lifecycle=new AbortController();
    const tools=[{name:'read_rehearsal_checks',title:'Read rehearsal checks',description:'Read the current rehearsal plan findings and the selected scene. Does not change the plan.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input:unknown){if(!input || typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');return {mode,sceneId:scene.id,findings};}},{name:'select_rehearsal_scene',title:'Select rehearsal scene',description:'Navigate to an existing scene. Does not edit or approve its plan.',inputSchema:{type:'object',properties:{sceneId:{type:'string'}},required:['sceneId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input:unknown){if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='sceneId')||!('sceneId' in input)||typeof input.sceneId!=='string'||!board.scenes.some(s=>s.id===input.sceneId))throw new Error('Choose an existing scene ID.');setSceneId(input.sceneId);await new Promise(requestAnimationFrame);return {selectedSceneId:input.sceneId};}}];
    for(const tool of tools) { try { void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{}); } catch {} }
    return ()=>lifecycle.abort();
  },[board,findings,mode,scene.id]);

  return <div className="desk">
    <header className="topbar"><a className="brand" href="/" aria-label="Prop Continuity Desk home"><span className="brand-mark" aria-hidden="true">P/</span><span>PROP CONTINUITY<span className="brand-sub">REHEARSAL DESK</span></span></a><div className="top-actions"><span className="edition">WORKING SCRIPT · 01</span>{studioUrl && <a className="button subtle" href={studioUrl} target="_blank" rel="noreferrer">Edit in Studio ↗</a>}<button className="button" disabled={loading} onClick={exportCues}>Export cue sheet <span aria-hidden="true">↗</span></button></div></header>
    <div className="mode-bar"><span><strong>{mode==='live'?'PUBLISHED PLAN':mode==='practice'?'PRACTICE COPY':'SAMPLE REHEARSAL'}</strong><span>{mode==='live'?'Read from Sanity. Edit the production in Studio.':'Changes stay in this tab. Reloading restores the starting plan.'}</span></span><div>{mode==='live'?<button onClick={()=>{requestSerial.current++;setLoading(false);setMode('practice');setNotice('You can now try changes without editing the published plan.');}}>Try a practice copy ↗</button>:<button onClick={()=>{requestSerial.current++;setLoading(false);setError('');setBoard(clone(demoBoard));setSceneId(demoBoard.scenes[1].id);setMode('demo');setNotice('Sample rehearsal restored.');}}>Reset sample</button>}{sanityConfigured && <button onClick={()=>void refresh()}>Load published plan</button>}</div></div>
    {error && <div className="error-box" role="alert"><strong>Published plan unavailable.</strong> {error} <button onClick={()=>void refresh()}>Try again</button><button onClick={()=>{requestSerial.current++;setLoading(false);setError('');setMode('demo');setBoard(clone(demoBoard));}}>Open labelled sample</button></div>}
    {loading ? <main className="loading">Loading the published rehearsal plan…</main> : error && mode==='live'?null:<>
    <section className="production-head"><div><p className="eyebrow">THE PROPS PLAN</p><h1>{board.production.title}</h1><p>{board.production.subtitle}</p></div><div className="run-summary"><div><strong>{String(board.scenes.length).padStart(2,'0')}</strong><span>scenes</span></div><div><strong>{String(board.props.length).padStart(2,'0')}</strong><span>props</span></div><div className={issueCount?'amber-stat':''}><strong>{String(issueCount).padStart(2,'0')}</strong><span>to resolve</span></div><div><strong>{checkedCount}<small>/{board.scenes.length}</small></strong><span>plans checked</span></div></div></section>
    <div className="workspace"><aside className="scene-rail"><div className="rail-heading"><h2>Running order</h2><span>ACT I</span></div><nav aria-label="Scenes">{board.scenes.map(s=>{const issues=findings.filter(f=>f.sceneId===s.id);const count=issues.filter(f=>f.kind!=='stale-review').length;const stale=issues.some(f=>f.kind==='stale-review');return <button key={s.id} className={`scene-button ${scene.id===s.id?'active':''}`} onClick={()=>setSceneId(s.id)} aria-current={scene.id===s.id?'step':undefined}><span className="scene-number">{String(s.number).padStart(2,'0')}</span><span><strong>{s.title}</strong><small>{count?`${count} ${count===1?'check':'checks'} to resolve`:stale?'Needs recheck':s.review?'Plan checked':'Not checked'}</small></span><span className={`scene-indicator ${count?'issue':stale?'stale':s.review?'done':''}`} aria-hidden="true">{count?count:stale?'↻':s.review?'✓':'—'}</span></button>})}</nav><div className="rail-note"><span aria-hidden="true">↳</span><p>Each scene records a planned prop position. A move needs a cue; a changed plan needs a fresh check.</p></div></aside>
    <main className="scene-work"><div className="scene-title"><div><p className="eyebrow">SCENE {String(scene.number).padStart(2,'0')} / {String(board.scenes.length).padStart(2,'0')}</p><h2>{scene.title}</h2><p>{scene.setting}</p></div><div className="view-switch" role="group" aria-label="Scene view"><button className={!showCues?'selected':''} onClick={()=>setShowCues(false)}>Stage plan</button><button className={showCues?'selected':''} onClick={()=>setShowCues(true)}>Cue list</button></div></div>
      {!showCues?<section className="stage" aria-label="Prop positions by stage zone"><div className="stage-note"><span>UPSTAGE</span><span>PERFORMER'S LEFT / RIGHT</span></div><div className="stage-floor">{[zones[2],zones[1],zones[0]].map(z=><div className="stage-zone" key={z.id}><div className="zone-heading"><span>{z.short}</span><h3>{z.name}</h3></div><div className="prop-stack">{scene.placements.filter(p=>p.location===z.id).map(p=><button key={p.id} className={`prop-chip ${selectedPlacement===p.id?'selected':''} ${sceneFindings.some(f=>f.propId===p.propId&&f.kind!=='stale-review')?'needs-attention':''}`} onClick={()=>setSelectedPlacement(selectedPlacement===p.id?null:p.id)} aria-pressed={selectedPlacement===p.id}><span className="prop-index">{p.propId.toUpperCase().replace('PROP-','')}</span><strong>{propName(p.propId)}</strong><span aria-hidden="true">↗</span></button>)}{!scene.placements.some(p=>p.location===z.id)&&<span className="empty-zone">No props recorded</span>}</div></div>)}</div><div className="apron"><span>DOWNSTAGE</span><div className="audience-line"/><span>AUDIENCE</span></div><div className="backstage"><span className="backstage-label">OFF<span>Backstage</span></span><div>{scene.placements.filter(p=>p.location==='BACKSTAGE').map(p=><button key={p.id} className={`backstage-prop ${selectedPlacement===p.id?'selected':''}`} onClick={()=>setSelectedPlacement(selectedPlacement===p.id?null:p.id)}>{propName(p.propId)}</button>)}{!scene.placements.some(p=>p.location==='BACKSTAGE')&&<span className="empty-zone">No props recorded</span>}</div></div></section>:<section className="cue-list" aria-label="Scene cue list">{scene.placements.map(p=><div key={p.id}><span className="cue-prop">{propName(p.propId)}<small>{locationName(p.location)}</small></span><span>{p.cue||'No transfer cue recorded'}</span><button onClick={()=>{setSelectedPlacement(p.id);setShowCues(false);}}>View prop ↗</button></div>)}</section>}
      {selected && <section className="prop-detail"><div className="detail-heading"><div><p className="eyebrow">PROP NOTE</p><h3>{propName(selected.propId)}</h3></div><button className="close-button" onClick={()=>setSelectedPlacement(null)} aria-label="Close prop detail">×</button></div><div className="detail-fields"><label>Planned position<select value={selected.location} disabled={!editable} onChange={e=>editScene(s=>({...s,placements:s.placements.map(p=>p.id===selected.id?{...p,location:e.target.value}:p)}))}>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label><div><span className="field-label">Transfer cue</span><p>{selected.cue||'No cue recorded.'}</p>{editable&&<button className="text-button" onClick={()=>{setEditingCue(selected.id);setCueText(selected.cue||'');}}>Edit cue ↗</button>}</div></div>{editable&&<button className="text-button danger" onClick={()=>{editScene(s=>({...s,placements:s.placements.filter(p=>p.id!==selected.id)}));setSelectedPlacement(null);}}>Remove this placement</button>}</section>}
      {editingCue&&<form className="cue-editor" onSubmit={e=>{e.preventDefault();if(!cueText.trim())return;editScene(s=>({...s,placements:s.placements.map(p=>p.id===editingCue?{...p,cue:cueText.trim()}:p)}));setEditingCue(null);}}><label htmlFor="cue-text">Who moves the prop, and on which cue?</label><textarea id="cue-text" autoFocus value={cueText} onChange={e=>setCueText(e.target.value)} placeholder="e.g. Len carries the torch to centre stage on ‘The lights!’" required maxLength={500}/><div><button type="button" className="button subtle" onClick={()=>setEditingCue(null)}>Cancel</button><button className="button primary" type="submit">Save practice cue</button></div></form>}
      <div className="scene-footer"><span>Only recorded positions are shown. An omitted prop is not assumed offstage.</span><div><button aria-label="Previous scene" disabled={sceneIndex===0} onClick={()=>setSceneId(board.scenes[sceneIndex-1].id)}>←</button><button aria-label="Next scene" disabled={sceneIndex===board.scenes.length-1} onClick={()=>setSceneId(board.scenes[sceneIndex+1].id)}>→</button></div></div>
    </main>
    <aside className="check-panel"><div className="panel-heading"><span className="eyebrow">BEFORE THE NEXT RUN</span><h2>Continuity check</h2></div><div className={`check-summary ${conflicts.length?'attention':'clear'}`}><span className="summary-symbol" aria-hidden="true">{conflicts.length?'!':'✓'}</span><div><strong>{conflicts.length?`${conflicts.length} ${conflicts.length===1?'detail needs':'details need'} attention`:'No continuity conflicts'}</strong><p>{conflicts.length?'Resolve these details before checking this scene.':'Read through the cues, then check this version of the plan.'}</p></div></div>
      <div className="findings">{conflicts.map((f,i)=><article className="finding" key={f.id}><div className="finding-type"><span>0{i+1}</span>{f.kind==='duplicate'?'TWO PLACES AT ONCE':'MISSING TRANSFER CUE'}</div><h3>{f.propId?propName(f.propId):'Scene detail'}</h3><p>{f.message}</p>{editable&&f.kind==='duplicate'&&<div className="resolve-options">{scene.placements.filter(p=>p.propId===f.propId).map(p=><button key={p.id} onClick={()=>editScene(s=>({...s,placements:s.placements.filter(q=>q.propId!==p.propId||q.id===p.id)}))}>Keep {locationName(p.location)} only ↗</button>)}</div>}{editable&&f.kind==='missing-transfer'&&<button className="resolve-button" onClick={()=>{const p=scene.placements.find(p=>p.propId===f.propId);if(p){setEditingCue(p.id);setCueText(p.cue||'');setSelectedPlacement(p.id);}}}>Add the transfer cue <span>+</span></button>}</article>)}</div>
      <section className="review-card"><div className="review-status"><span className={checked?'checked':isStale?'stale':''}>{checked?'✓':isStale?'↻':'○'}</span><h3>{isStale?'Needs recheck':checked?'Plan checked':'Not checked yet'}</h3></div><p>{isStale?'The plan or an incoming prop detail changed after the last check. Read it again before signing off.':checked?`Checked by ${scene.review?.reviewer}. This check belongs to the current recorded plan.`:'A check records that someone reviewed the plan. It does not confirm that physical props are in place.'}</p>{editable?<button className="button review-button" onClick={approve} disabled={conflicts.length>0||checked}>{checked?'Current plan checked':'Mark plan checked'}<span aria-hidden="true">✓</span></button>:<p className="live-hint">Reviews are recorded by an authenticated editor in Sanity Studio.</p>}</section>
      <p className="checking-note">Checks follow the content. Changing a relevant scene, prop or cue makes an old check expire.</p>
    </aside></div><footer className="desk-footer"><span>PROP CONTINUITY DESK</span><span>{mode==='live'?'Published content · Sanity Content Lake':'Fictional production · practice data'} · Plan, rehearse, recheck.</span></footer></>}
    <div className="notice" role="status" aria-live="polite">{notice}</div>
  </div>;
}
