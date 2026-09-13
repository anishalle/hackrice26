// Incremental SSE framing: handles UTF-8 decoding upstream, split CRLF, comments,
// multiple events per chunk, and multi-line data fields.
export function createEventParser(onEvent) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    let match;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const frame = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, '')).join('\n');
      if (data && data !== '[DONE]') onEvent(JSON.parse(data));
    }
  };
}

export function applyAgentEvent(turn, event) {
  const item = event.item;
  if (event.type === 'response.output_text.delta') {
    return { ...turn, stage: 'streaming', answer: turn.answer + event.delta };
  }
  if (event.type === 'response.created' || event.type === 'response.in_progress') {
    return { ...turn, stage: 'thinking' };
  }
  if (item?.type === 'function_call' && event.type.startsWith('response.output_item.')) {
    const existing = turn.tools.find((tool) => tool.call_id === item.call_id);
    const tool = { ...existing, ...item, status: item.status ?? existing?.status
      ?? (event.type === 'response.output_item.done' ? 'completed' : 'in_progress') };
    return { ...turn, stage: 'thinking', tools: existing
      ? turn.tools.map((t) => t.call_id === item.call_id ? tool : t)
      : [...turn.tools, tool] };
  }
  if (item?.type === 'function_call_output') {
    return { ...turn, tools: turn.tools.map((tool) => tool.call_id === item.call_id
      ? { ...tool, output: item.output, status: item.status ?? 'completed' } : tool) };
  }
  if (event.type === 'response.completed') {
    const output = event.response.output ?? [];
    const answer = output.filter((i) => i.type === 'message')
      .flatMap((i) => i.content ?? []).filter((c) => c.type === 'output_text')
      .map((c) => c.text).join('\n');
    let final = turn;
    for (const item of output) {
      if (item.type === 'function_call' || item.type === 'function_call_output') {
        final = applyAgentEvent(final, { type: 'response.output_item.done', item });
      }
    }
    return { ...final, answer: answer || turn.answer, stage: 'done' };
  }
  return turn;
}


// Interpret structured result flags without exposing payloads in the chat.
export function toolPresentation(tool, done = false) {
  let result = tool.output;
  if (Array.isArray(result)) result = result.map((part) => part.text ?? '').join('\n');
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch { result = null; }
  }
  const error = result && typeof result === 'object' ? result.error : null;
  const errorText = typeof error === 'string' ? error : error?.message;
  let state;
  if (/^blocked\b/i.test(errorText ?? '') || result?.status === 'blocked') state = 'blocked';
  else if (error || result?.success === false || result?.is_error === true
    || result?.status === 'error' || result?.status === 'failed'
    || (typeof result?.exit_code === 'number' && result.exit_code !== 0)
    || tool.status === 'failed') state = 'failed';
  else if (tool.status === 'completed' || tool.output != null) state = 'completed';
  else if (tool.status === 'cancelled' || tool.status === 'incomplete') state = 'interrupted';
  else state = done ? 'unknown' : 'running';
  let browserAction;
  try { browserAction = JSON.parse(tool.arguments || '{}').action; } catch {}
  const browserNames = { navigate: 'Open webpage', snapshot: 'Read webpage', click: 'Click on page', type: 'Enter text', scroll: 'Scroll webpage' };
  const names = {
    axl_browser: browserNames[browserAction] || 'Use browser',
    web_search: 'Web search', web_extract: 'Read webpage',
    execute_code: 'Execute code', terminal: 'Run command',
    browser_navigate: 'Open webpage', browser_snapshot: 'Read browser',
    browser_click: 'Click in browser', browser_type: 'Type in browser',
    browser_scroll: 'Scroll webpage', browser_use: 'Use browser',
    delegate_task: 'Delegate task',
  };
  const fallback = (tool.name || 'Tool').replace(/_/g, ' ');
  return { label: names[tool.name] ?? fallback.charAt(0).toUpperCase() + fallback.slice(1), state };
}
