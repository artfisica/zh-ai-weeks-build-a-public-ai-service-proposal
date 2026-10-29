'use strict';
const fs=require('node:fs');
// Evaluation tools run sequentially and share this local ledger. Every /chat
// attempt counts, including a network failure before an upstream response.
function reserve(file,stage){if(!file)return;let ledger;try{ledger=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;ledger={maxCalls:40,calls:[]};}if(!Number.isSafeInteger(ledger.maxCalls)||ledger.maxCalls<1||ledger.maxCalls>100||!Array.isArray(ledger.calls))throw new Error('Invalid live evaluation ledger');if(ledger.calls.length>=ledger.maxCalls)throw new Error('Combined live evaluation cap reached ('+ledger.maxCalls+')');ledger.calls.push({at:new Date().toISOString(),stage});fs.writeFileSync(file,JSON.stringify(ledger,null,2)+'\n',{mode:0o600});}
module.exports={reserve};
