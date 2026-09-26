import { defineArrayMember, defineField, defineType } from 'sanity';
export const schemaTypes=[
defineType({name:'production',title:'Production',type:'document',fields:[
defineField({name:'title',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'subtitle',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'scenes',title:'Scenes in running order',type:'array',of:[defineArrayMember({type:'reference',to:[{type:'scene'}]})],validation:Rule=>Rule.required().min(1).unique()})]}),
defineType({name:'prop',title:'Prop inventory',type:'document',fields:[
defineField({name:'name',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'category',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'production',type:'reference',to:[{type:'production'}],validation:Rule=>Rule.required()})],preview:{select:{title:'name',subtitle:'category'}}}),
defineType({name:'scene',title:'Scene preset',type:'document',fields:[
defineField({name:'title',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'setting',type:'text',rows:2,validation:Rule=>Rule.required()}),
defineField({name:'production',type:'reference',to:[{type:'production'}],validation:Rule=>Rule.required()}),
defineField({name:'placements',title:'Planned prop positions',description:'One row per physical prop. Positions are snapshots; cue text explains the incoming move.',type:'array',of:[defineArrayMember({name:'placement',type:'object',fields:[
defineField({name:'prop',type:'reference',to:[{type:'prop'}],validation:Rule=>Rule.required()}),
defineField({name:'location',type:'string',options:{list:[{title:'Stage left',value:'SL'},{title:'Centre stage',value:'CS'},{title:'Stage right',value:'SR'},{title:'Backstage',value:'BACKSTAGE'}]},validation:Rule=>Rule.required()}),
defineField({name:'cue',title:'Who moves it, and on which cue?',type:'text',rows:2,validation:Rule=>Rule.max(500)})],preview:{select:{title:'prop.name',subtitle:'location'}}})],validation:Rule=>Rule.required()})]}),
defineType({name:'sceneReview',title:'Plan check history',type:'document',readOnly:true,fields:[
defineField({name:'scene',type:'reference',to:[{type:'scene'}],validation:Rule=>Rule.required()}),
defineField({name:'production',type:'reference',to:[{type:'production'}],validation:Rule=>Rule.required()}),
defineField({name:'sourceRevision',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'fingerprint',type:'text',validation:Rule=>Rule.required()}),
defineField({name:'reviewer',type:'string',validation:Rule=>Rule.required()}),
defineField({name:'reviewedAt',type:'datetime',validation:Rule=>Rule.required()})],preview:{select:{title:'scene.title',subtitle:'reviewedAt'}}})
];
