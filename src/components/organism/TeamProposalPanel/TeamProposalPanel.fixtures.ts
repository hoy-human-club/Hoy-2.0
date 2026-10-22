import {createElement as h} from 'react';
import {tenant} from '../../../tenant/tenant';
import type {TeamSnapshot} from '../../../modules/admin/teamProposals';
import {TeamProposalPresentation,type TeamPresentationModel,type TeamProposalPreview} from './TeamProposalPanel';

// Deterministic D02 presentation inputs only. No actual hook, provider, storage or session API.
const empty:TeamSnapshot={version:1,tenantId:tenant.id,actorId:'fictional-library-actor',role:'admin',revision:0,members:[],invitations:[],requests:{}};
const populated:TeamSnapshot={...empty,revision:2,members:[{personId:'fictional-team-admin-a',role:'admin',state:'active'},{personId:'fictional-team-admin-b',role:'admin',state:'active'}]};
const change:Omit<TeamProposalPreview,'context'>={input:{type:'change',personId:'fictional-team-admin-a',role:'front_desk',expectedRevision:2},preview:true,gap:false};
const base:TeamPresentationModel={snapshot:populated,loading:false,busy:false,error:null,saved:false,canRetry:false,run:async()=>populated,retry:async()=>populated,reload:async()=>{},cancel:()=>{},changed:()=>{}};
export const TEAM_PRESENTATION_CASES=[
 {id:'empty',title:{es:'Vacío · ejemplo solo en memoria',en:'Empty · in-memory example'},model:{snapshot:empty}},
 {id:'loading',title:{es:'Lectura en curso',en:'Scoped loading'},model:{snapshot:null,loading:true}},
 {id:'read-error',title:{es:'Error de lectura · reintentar',en:'Read error · retry'},model:{snapshot:null,error:'read'}},
 {id:'draft',title:{es:'Borrador de propuesta',en:'Proposal draft'},model:{},proposal:{input:{type:'invite',personId:'fictional-team-invite-a',role:'front_desk',expectedRevision:2},preview:false,gap:false}},
 {id:'preview',title:{es:'Vista previa · cancelar',en:'Preview · cancel'},model:{},proposal:change},
 {id:'busy',title:{es:'Guardando · dejar de esperar',en:'Busy · stop waiting'},model:{busy:true},proposal:change},
 {id:'error',title:{es:'Fallo local · reintentar',en:'Local failure · retry'},model:{error:'save',canRetry:true},proposal:change},
 {id:'stale',title:{es:'Revisión cambiada · recargar',en:'Stale revision · reload'},model:{error:'stale'},proposal:change},
 {id:'saved',title:{es:'Lectura local confirmada',en:'Confirmed local readback'},model:{saved:true}},
 {id:'replay',title:{es:'Repetición confirmada · mismo estado guardado',en:'Confirmed replay · same saved state'},model:{saved:true}},
 {id:'cancelled',title:{es:'Espera cancelada · sin confirmación tardía',en:'Waiting cancelled · no late acknowledgement'},model:{saved:false}},
 {id:'unresolved',title:{es:'Escenario sin decisión · sin aplicar',en:'Unresolved scenario · no apply'},model:{},proposal:{...change,gap:true}},
] satisfies {id:string;title:{es:string;en:string};model:Partial<TeamPresentationModel>;proposal?:Omit<TeamProposalPreview,'context'>}[];
export function renderTeamPresentation(id:string){const example=TEAM_PRESENTATION_CASES.find(c=>c.id===id)!;return h(TeamProposalPresentation,{team:{...base,...example.model},context:`fictional-library-${id}`,initialProposal:'proposal' in example?example.proposal:null,inlinePreview:'proposal' in example,stateId:id,fixture:true,fixtureLabel:example.title});}
