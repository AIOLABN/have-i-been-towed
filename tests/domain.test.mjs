import test from 'node:test';
import assert from 'node:assert/strict';
const d = await import('../lib/domain.mjs').catch(() => ({}));
test('normalizes only plate separators and rejects arbitrary punctuation',()=>{
 assert.equal(typeof d.normalizePlate,'function');
 assert.equal(d.normalizePlate(' 9wkr-761 '),'9WKR761');
 for(const v of ['', 'ABC<script>', 'ABCDEFGHIJK', '🚘']) assert.throws(()=>d.normalizePlate(v));
});
test('requires a supported registration state for real lookup',()=>{
 assert.equal(typeof d.validateLookup,'function');
 assert.deepEqual(d.validateLookup({plate:'abc 123',state:'FL'}),{plate:'ABC123',state:'FL'});
 for(const v of [{plate:'ABC123',state:''},{plate:'ABC123',state:'ZZ'}]) assert.throws(()=>d.validateLookup(v));
});
test('enforces finite confidence and bounded observations on worker results',()=>{
 assert.equal(typeof d.validateDetection,'function');
 assert.equal(d.validateDetection({plate:'abc123',confidence:0.91,votes:3}).plate,'ABC123');
 for(const confidence of [NaN, Infinity,-0.01,1.01]) assert.throws(()=>d.validateDetection({plate:'ABC123',confidence,votes:3}));
 assert.throws(()=>d.validateDetection({plate:'ABC123',confidence:.9,votes:0}));
});
test('sample is historical evidence and never a claimed current tow',()=>{
 assert.equal(d.DEMO_RECORD?.is_demo,true);
 assert.equal(d.DEMO_RECORD?.votes,86);
 assert.equal(d.DEMO_RECORD?.plate,'9WKR761');
 assert.equal(d.DEMO_RECORD?.review_status,'demo');
});
