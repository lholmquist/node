'use strict';
const common = require('../common');
const path = require('path');
const spawn = require('child_process').spawn;
const assert = require('assert');
const fixture = path.join(
  common.fixturesDir,
  'debugger-repeat-last.js'
);

const args = [
  'debug',
  `--port=${common.PORT}`,
  fixture
];

const proc = spawn(process.execPath, args, { stdio: 'pipe' });
proc.stdout.setEncoding('utf8');

let stdout = '';

let sentCommand = false;
let sentEmpty = false;
let sentExit = false;

proc.stdout.on('data', (data) => {
  stdout += data;
  if (!sentCommand && stdout.includes('> 1')) {
    sentCommand = true;
    return;
  }

  if (!sentEmpty) {
    setImmediate(() => {proc.stdin.write('list(10)\n');});
    sentEmpty = true;
    return;
  }
  if (!sentExit && sentCommand && sentEmpty) {
    setImmediate(() => {proc.stdin.write('\n\n\n.exit\n\n\n');});
    sentExit = true;
    return;
  }
});

proc.on('exit', common.mustCall((exitCode, signal) => {
  assert.strictEqual(exitCode, 0);
  assert.strictEqual(signal, null);
  // No module wrapping at the first line
  assert.strictEqual(
    stdout.includes('> 1 var a = 1;'),
    true,
    'debugger should not have the module wrapper'
  );
  // No module wrapping at the end
  assert.strictEqual(
    stdout.includes('9 });'),
    false,
    'the last line of the debugger should not have the module wrapping ending'
  );
}));
