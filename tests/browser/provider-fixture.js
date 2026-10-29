'use strict';
// Explicit new-wire-protocol fixtures. These do not simulate live model quality.
const {map,story,step,clone}=require('../fixtures');
function providerFixture(request){
 const system=request.messages[0].content,user=request.messages[1].content;
 if(system.includes('QUESTION_LABELS_V1')){const questions=JSON.parse(user.split('\nRepair:')[0]);return {questions:questions.map(q=>({id:q.id,text:system.includes('French')?'Quelle est votre nationalité ?':'What is your nationality?',options:q.options.map(o=>o==='Third country'?'État tiers':o==='État tiers'?'Third country':o)}))};}
 if(system.includes('COMMAND_V1')){
  const text=user.split('Original follow-up: ')[1].split('\nFacts: ')[0];
  if(/still move|toujours/i.test(text))return {type:'add_fact'};
  if(/I work in Geneva|also work in Geneva/i.test(text))return {type:'add_fact'};
  if(/Swiss|French/i.test(text)){const value=text.includes('French')?'French':'Swiss';return {type:'add_fact',answers:[{id:'nationality',value,quote:'I am '+value}]};}
  if(/Gland/i.test(text))return {type:'replace_fact',target:'destination',value:'Gland'};
  if(/insurance/i.test(text))return {type:'add_goal'};
  return {type:'ask'};
 }
 if(user.includes('CHANGE_PROPOSAL_V1')){
  const revision=user.split('Revision: ')[1].split('\n')[0],change=JSON.parse(user.split('\nRequested change: ')[1].split('\nSituation: ')[0]),facts=JSON.parse(user.split('\nFacts owned by the app: ')[1].split('\nConfirmed answers: ')[0]),accepted=JSON.parse(user.split('\nAccepted map: ')[1].split('\nOnly these')[0]),operations=[];
  if(change.kind==='addition')operations.push({op:'add_branch',branch:{id:'insurance',name:'Insurance',need:'insurance',steps:[{...step('cover','Compare cover','Compare insurance coverage',null,['permit']),purpose:'insurance'}]}});
  else if(change.kind==='completion')operations.push({op:'add_action',branch:'school',after:'school_contact',action:{...step('after_school','Ask about care','Ask about after-school care options',null,['children']),purpose:'school'}});
  else if(change.id==='destination'){
   for(const branch of accepted.branches)for(const old of branch.steps)if(old.depends_on.includes('destination')){const value=facts.find(f=>f.id==='destination').value,action=clone(old);action.title='Ask about '+(old.id==='arrival'?'arrival':branch.name.toLowerCase())+' in '+value;action.short=action.title;action.sources=old.id==='arrival'?[{id:value==='Gland'?'gland-cdh':'stcergue-arrival',claim:'c1'}]:action.sources;operations.push({op:'replace_action',branch:branch.id,target:old.id,action});}
  }
  return {revision,operations};
 }
 const sentence=(user.match(/^Situation: ([^\n]+)/)||[])[1]||story;return map(sentence.includes('Gland')?'Gland':'Saint-Cergue');
}
module.exports={providerFixture};
