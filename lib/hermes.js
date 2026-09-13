import { backendFetch } from './backend';
import { createEventParser } from './agent-events.mjs';

export async function streamAgent({ input, sessionId, previousResponseId, signal, onEvent }) {
  const response = await backendFetch('/agents/responses', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ input, session_id: sessionId, previous_response_id: previousResponseId || null, stream: true }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : `Axl request failed (${response.status}).`);
  }
  if (!response.body) throw new Error('Axl returned no event stream.');
  let completed = false;
  let responseId;
  const parse = createEventParser((event) => {
    if (['error', 'response.failed', 'response.incomplete', 'response.cancelled'].includes(event.type)) {
      throw new Error(event.message || event.response?.error?.message || 'Axl could not finish this response.');
    }
    if (event.type === 'response.completed') {
      completed = true;
      responseId = event.response.id;
    }
    onEvent(event);
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parse(decoder.decode(value, { stream: true }));
    }
    parse(decoder.decode());
    if (!completed) throw new Error('Axl disconnected before finishing. Please try again.');
    return responseId;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
