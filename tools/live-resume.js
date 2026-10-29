'use strict';
function resumePlan(report){
  if(!report)return {passed:new Set(),checkpoint:null};
  if(!Array.isArray(report.steps))throw new Error('Resume report has no verified step inventory');
  const passed=new Set(report.steps.filter(step=>['passed','previous-live-pass'].includes(step.status)).map(step=>step.name));
  // Old reports captured only the pre-comparison state; Keep/Adopt/Undo
  // returns to that state. Later successful mutations need a real checkpoint.
  const legacy=new Set(['connection','1-2-editable-personal-facts','confirm-nationality-and-complete-departure','3-4-proposed-Gland-and-inspected-consequences','5-Keep-repeat-Adopt-Undo']);
  if(!report.checkpoint&&Array.from(passed).some(name=>!legacy.has(name)))throw new Error('Successful later steps have no matching saved checkpoint; do not replay them against an earlier state');
  if(passed.has('3-4-proposed-Gland-and-inspected-consequences')&&!passed.has('5-Keep-repeat-Adopt-Undo'))throw new Error('The comparison preview was not stored in the accepted checkpoint; resume from a completed durable step or start a fresh journey');
  const checkpoint=report.checkpoint || report.acceptedBeforeComparison;
  if(!checkpoint||typeof checkpoint.story!=='string'||!Array.isArray(checkpoint.vars)||!checkpoint.tree||!Array.isArray(checkpoint.tree.branches))throw new Error('Resume report has no valid accepted checkpoint');
  return {passed,checkpoint};
}
module.exports={resumePlan};
