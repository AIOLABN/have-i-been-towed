import {createRequire} from 'node:module';
import {readFile,readdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const wranglerRequire=createRequire(await realpath(path.join(root,'node_modules/wrangler/package.json')));
const {Miniflare}=wranglerRequire('miniflare');
const drizzleRequire=createRequire(await realpath(path.join(root,'node_modules/drizzle-kit/package.json')));
const {build}=drizzleRequire('esbuild');
const bundled=await build({entryPoints:['tests/api-entry.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers']});
const mf=new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{OPERATOR_EMAILS:'qa@tow.test,other@tow.test',OPERATOR_PASSWORD:'qa-password-123',SESSION_SECRET:'qa-session-secret-value'}});
const db=await mf.getD1Database('DB');const bucket=await mf.getR2Bucket('BUCKET');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile('drizzle/'+file,'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run()}
const PASSWORD='qa-password-123';
async function signIn(email){const r=await request('login',{method:'POST',body:{email,password:PASSWORD}});assert.equal(r.status,200,'sign-in failed for '+email);const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);return {cookie:cookie.split(';')[0]}}
const user=await signIn('qa@tow.test');
const other=await signIn('other@tow.test');
let count=0;
async function request(endpoint,{method='GET',body,headers={}}={}){const req=new Request('https://tow.test/api/'+endpoint,{method,headers:{...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});return mf.dispatchFetch(req.url,{method,headers:Object.fromEntries(req.headers),...(body?{body:await req.arrayBuffer()}:{})})}
async function call(endpoint,options,expected=200){const r=await request(endpoint,options);const data=await r.json();assert.equal(r.status,expected,JSON.stringify({endpoint,data}));return data}
const pass=label=>{count++;console.log('PASS '+label)};
try{
 await call('records',{},401);await call('jobs',{method:'POST'},401);await call('worker/claim',{method:'POST'},401);await call('login',{method:'POST',body:{email:'not-approved@test.com',password:PASSWORD}},401);await call('login',{method:'POST',body:{email:'qa@tow.test',password:'wrong-password'}},401);await call('worker/token',{method:'POST',body:{}},401);await call('records',{headers:{cookie:user.cookie.slice(0,-3)+'abc'}},401);pass('anonymous and unapproved writes denied');
 await call('lookup',{method:'POST',headers:{origin:'https://foreign.test'},body:{plate:'A123',state:'FL'}},403);await call('lookup',{method:'POST',body:{plate:'ABC123',state:'ZZ'}},422);pass('foreign origin and invalid state rejected');
 assert.equal((await call('lookup',{method:'POST',body:{plate:'9WKR761',state:'CA'}})).record,null);assert.equal((await call('lookup',{method:'POST',body:{plate:'9WKR761',state:'CA',demo:true}})).record.is_demo,true);pass('historical demo excluded from real lookup');
 const {token}=await call('worker/token',{method:'POST',headers:user,body:{}});const auth={authorization:'Bearer '+token};
 const form=new FormData();const bytes=await readFile('public/media/tow-demo.mp4');form.set('video',new File([bytes],'integration-test.mp4',{type:'video/mp4'}));form.set('state','CA');form.set('truck_id','QA-01');form.set('destination','Integration Test Yard');const job=await call('jobs',{method:'POST',headers:user,body:form},201);
 assert.equal((await call('jobs',{headers:other})).jobs.length,0);pass('upload stored and scoped to owner');
 const claim=(await call('worker/claim',{method:'POST',headers:auth,body:{}})).job;assert.equal(claim.id,job.id);const download=await request('worker/media/'+job.id,{headers:{...auth,'x-job-lease':claim.lease_id}});assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);pass('worker claims and downloads exact footage');
 await call('worker/complete',{method:'POST',headers:auth,body:{job_id:job.id,lease_id:'stale',analyzed_frames:100,detections:[]}},409);
 await call('worker/complete',{method:'POST',headers:auth,body:{job_id:job.id,lease_id:claim.lease_id,analyzed_frames:100,detections:[{plate:'QA1234',confidence:1.5,votes:3}]}},422);
 assert.equal((await call('records',{headers:user})).records.length,0);pass('stale leases and invalid results create no evidence');
 const snapshot=(await readFile('public/media/evidence.jpg')).toString('base64');const payload={job_id:job.id,lease_id:claim.lease_id,analyzed_frames:100,detections:[{plate:'QA1234',confidence:.95,votes:8,snapshot_base64:snapshot}]};
 await call('worker/complete',{method:'POST',headers:auth,body:payload});await call('worker/complete',{method:'POST',headers:auth,body:payload});const record=(await call('records',{headers:user})).records[0];assert.equal(record.plate,'QA1234');assert.equal((await call('records',{headers:user})).records.length,1);assert.equal(record.review_status,'pending');assert.equal(await bucket.get('uploads/'+job.id),null);pass('completion is idempotent; private evidence persists; raw video deleted');
 await call('media/'+record.id,{},401);await call('records/'+record.id,{method:'PATCH',headers:other,body:{status:'published'}},404);assert.equal((await call('lookup',{method:'POST',body:{plate:'QA1234',state:'CA'}})).record,null);pass('unreviewed evidence cannot be exposed or cross-owner edited');
 await call('records/'+record.id,{method:'PATCH',headers:user,body:{status:'published'}});assert.equal((await call('lookup',{method:'POST',body:{plate:'qa-1234',state:'CA'}})).record.id,record.id);assert.equal((await call('lookup',{method:'POST',body:{plate:'QA1234',state:'FL'}})).record,null);assert.equal((await request('media/'+record.id)).status,200);pass('reviewed exact plate+state lookup and snapshot retrieval');
 await call('records/'+record.id,{method:'PATCH',headers:user,body:{status:'rejected'}});assert.equal((await call('lookup',{method:'POST',body:{plate:'QA1234',state:'CA'}})).record,null);await call('media/'+record.id,{},401);pass('withdrawn records disappear from public lookup and media');
 await bucket.put('uploads/'+job.id,'cleanup retry fixture');await db.prepare('UPDATE jobs SET upload_deleted_at=NULL WHERE id=?').bind(job.id).run();await call('worker/heartbeat',{method:'POST',headers:auth,body:{}});assert.equal(await bucket.get('uploads/'+job.id),null);assert.ok((await db.prepare('SELECT upload_deleted_at FROM jobs WHERE id=?').bind(job.id).first()).upload_deleted_at);pass('durable raw-footage cleanup retried by heartbeat');
 await call('worker/token',{method:'POST',headers:user,body:{}});await call('worker/claim',{method:'POST',headers:auth,body:{}},401);pass('replaced worker key is revoked');
 console.log(`\n${count} integration scenarios passed against real D1/R2 emulation.`);
} finally {await mf.dispose()}
