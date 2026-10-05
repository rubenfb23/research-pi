import test from 'node:test';
import assert from 'node:assert/strict';
import {transducerFPower} from './official-replay-parser.mjs';
test('multi-stage logs cannot attribute the next transducer power to an earlier F header',()=>{
 const log='Transducer:  F\nfs = 1000 kHz\nMeasured data results\nTransducer:  A\nPload = 111 mW\nTransducer:  B\nPload = 99 mW\nTransducer:  F\nTHD = 8 %\nPload = 42.25 mW\n';
 assert.equal(transducerFPower(log),42.25);
 assert.equal(transducerFPower('Transducer: F\nfs=100\nTransducer: A\nPload = 111 mW\n'),null);
 assert.throws(()=>transducerFPower(log+'Transducer: F\nPload = 777 mW\n'),/Ambiguous/);
});
