import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventParser, applyAgentEvent } from '../lib/agent-events.mjs';

test('SSE survives every split including CRLF and multiline data', () => {
  const wire = ': heartbeat\r\n\r\nevent: response.output_text.delta\r\ndata: {"type":"response.output_text.delta",\r\ndata: "delta":"héllo"}\r\n\r\ndata: [DONE]\n\n';
  for (let split = 0; split < wire.length; split++) {
    const events = [];
    const parse = createEventParser((e) => events.push(e));
    parse(wire.slice(0, split)); parse(wire.slice(split));
    assert.deepEqual(events, [{ type: 'response.output_text.delta', delta: 'héllo' }]);
  }
});

test('tool lifecycle deduplicates call IDs and retains results with final text', () => {
  let turn = { answer: '', tools: [], stage: 'loading' };
  const call = { type: 'function_call', call_id: 'call_1', name: 'terminal', status: 'in_progress' };
  turn = applyAgentEvent(turn, { type: 'response.output_item.added', item: call });
  assert.equal(turn.tools[0].status, 'in_progress');
  const output = { type: 'function_call_output', call_id: 'call_1', output: [{ type: 'input_text', text: 'ok' }], status: 'completed' };
  turn = applyAgentEvent(turn, { type: 'response.output_item.done', item: output });
  turn = applyAgentEvent(turn, { type: 'response.output_text.delta', delta: 'Hi' });
  turn = applyAgentEvent(turn, { type: 'response.completed', response: { output: [
    { ...call, status: 'completed' }, output,
    { type: 'message', content: [{ type: 'output_text', text: 'Hi there' }] },
  ] } });
  assert.equal(turn.tools.length, 1);
  assert.equal(turn.tools[0].status, 'completed');
  assert.deepEqual(turn.tools[0].output, output.output);
  assert.equal(turn.answer, 'Hi there');
  assert.equal(turn.stage, 'done');
});

test('final Hermes output without status preserves completion', () => {
  let turn = { answer: '', tools: [], stage: 'thinking' };
  const call = { type: 'function_call', call_id: 'a', name: 'web_search' };
  turn = applyAgentEvent(turn, { type: 'response.output_item.added', item: { ...call, status: 'in_progress' } });
  turn = applyAgentEvent(turn, { type: 'response.completed', response: { output: [call,
    { type: 'function_call_output', call_id: 'a', output: [{ type: 'input_text', text: '{"success":true}' }] },
  ] } });
  assert.equal(turn.tools[0].status, 'completed');
});

test('summary distinguishes blocked, failed, successful and unconfirmed tools', async () => {
  const { toolPresentation } = await import('../lib/agent-events.mjs');
  const tool = { name: 'execute_code', status: 'completed' };
  assert.equal(toolPresentation({ ...tool, output: '{"status":"error","error":"BLOCKED: execute_code"}' }, true).state, 'blocked');
  assert.equal(toolPresentation({ ...tool, output: '{"exit_code":1}' }, true).state, 'failed');
  assert.equal(toolPresentation({ ...tool, output: '{"exit_code":0,"error":null}' }, true).state, 'completed');
  assert.equal(toolPresentation({ name: 'web_search' }, true).state, 'unknown');
  assert.equal(toolPresentation({ name: 'web_search' }).state, 'running');
});
