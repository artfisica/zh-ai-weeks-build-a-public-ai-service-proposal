'use strict';
const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'tests/browser',timeout:30000,fullyParallel:true,forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,workers:process.env.CI?2:undefined,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:8137',locale:'en-GB',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'node tests/browser/server.js',url:'http://127.0.0.1:8137',reuseExistingServer:false},
  projects:[{name:'desktop',use:{browserName:'chromium',viewport:{width:1440,height:1000}}},{name:'mobile',use:{...devices['iPhone 13'],browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox',viewport:{width:1440,height:1000}}},{name:'safari-mobile',use:{...devices['iPhone 13'],browserName:'webkit'}}]
});
