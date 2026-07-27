// Self-check for src/lib/quant.ts.
// Run: node --experimental-strip-types scripts/check-quant.mjs
import assert from 'node:assert';
import { nextQuantStage } from '../src/lib/quant.ts';

assert.equal(nextQuantStage('boot', 'boot-complete'), 'question');
assert.equal(nextQuantStage('question', 'answer-wrong'), 'question');
assert.equal(nextQuantStage('question', 'answer-right'), 'install');
assert.equal(nextQuantStage('install', 'install-complete'), 'prompt');
assert.equal(nextQuantStage('prompt', 'decline'), 'declined');
assert.equal(nextQuantStage('prompt', 'accept'), 'art');
assert.equal(nextQuantStage('art', 'exit-art'), 'prompt');
assert.equal(nextQuantStage('boot', 'installed-mount'), 'prompt');

console.log('quant self-check OK');
