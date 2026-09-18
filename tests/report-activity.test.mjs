import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { activityQuery, activityRemoval, activityIdValid, logoLabel, parseActivityPage, parseActivityDetail } from '../lib/reportActivity.ts';
const id='a'.repeat(64);
const row={id,owner:{id:'a'.repeat(24),name:'Example',email:'test@example.test'},source:'web',reportType:'asset',contract:'93530',latestCounts:{lots:1,photos:2,mainPhotos:1,extraPhotos:1},revision:2};
test('unknown logo evidence is never shown as Off',()=>{assert.equal(logoLabel(null),'Not recorded');assert.equal(logoLabel(),'Not recorded');assert.equal(logoLabel(false),'Off');assert.equal(logoLabel(true),'On');});
test('bounded search, filters and identities',()=>{
 assert.equal(activityIdValid(id),true);assert.equal(activityIdValid('a'.repeat(24)),false);
 const query=new URLSearchParams(activityQuery(new URLSearchParams('search=93530%20%26%20B&action=preview_saved&role=superadmin')));
 assert.equal(query.get('search'),'93530 & B');assert.equal(query.has('role'),false);
 for(const q of ['page=0','limit=101','page=1&page=2','reportType=salvage','source=forged','from=2026-02-30','from=2026-09-19&to=2026-09-18'])assert.throws(()=>activityQuery(new URLSearchParams(q)));
});
test('removal accepts only reviewed revisions',()=>{assert.deepEqual(activityRemoval({revision:2}),{revision:2});for(const b of [{},{revision:-1},{revision:'2'},{revision:2,owner:'forged'}])assert.throws(()=>activityRemoval(b));});
test('malformed counts do not become zero and baselines keep unknown counts',()=>{
 const page=item=>({data:{items:[item],total:1,page:1,limit:25}});
 assert.equal(parseActivityPage(page({...row,latestCounts:null})).items[0].latestCounts,null);
 for(const counts of [{lots:1,photos:5,mainPhotos:1,extraPhotos:1},{lots:1,photos:0,mainPhotos:undefined,extraPhotos:0}])assert.throws(()=>parseActivityPage(page({...row,latestCounts:counts})));
});
test('preview links must remain local, exact and permission checked',()=>{
 const detail={...row,canViewValues:true,canOpenPreview:true,canRemove:true,reportExists:true,previewPath:'/preview-reports'};
 assert.equal(parseActivityDetail({data:detail}).previewPath,'/preview-reports');
 assert.equal(parseActivityDetail({data:{...detail,previewPath:'/reports/'+'b'.repeat(24)+'/data'}}).canOpenPreview,true);
 for(const path of ['https://example.test','//example.test','/reports/../data'])assert.throws(()=>parseActivityDetail({data:{...detail,previewPath:path}}));
});
test('admin BFF preserves auth boundary and guarded removal',()=>{
 const route=readFileSync(new URL('../app/api/admin/report-activity/[id]/route.ts',import.meta.url),'utf8');
 assert.match(route,/proxyJsonWithAdminAuth/);assert.match(route,/readPreviewMutationJson\(request, 1024\)/);assert.match(route,/activityRemoval/);
 const legacy=readFileSync(new URL('../app/offline-captures/page.tsx',import.meta.url),'utf8');assert.match(legacy,/report-activity\?tab=captures/);
});
