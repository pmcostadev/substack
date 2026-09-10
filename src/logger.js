const LEVELS = {silent: 0, error: 1, warn: 2, info: 3, debug: 4};
const DEFAULT_LEVEL = 'info';
const SECRET_KEY = /token|cookie|password|secret|auth|session|^sid$/i;
const REDACTED = '***';
const DATA_URI_PREFIX = /^data:[^,]*;base64,/i;

function truncateDataUri(value) {
  const match = value.match(DATA_URI_PREFIX);
  if (!match) return value;
  const payload = value.length - match[0].length;
  if (payload <= 32) return value;
  return `${match[0]}…(${payload} base64 chars omitted)`;
}

function currentLevel() {
  const configured = (process.env.SUBSTACK_MCP_LOG_LEVEL || '').trim().toLowerCase();
  return LEVELS[configured] ?? LEVELS[DEFAULT_LEVEL];
}

function redact(value, seen = new WeakSet()) {
  if (value instanceof Error) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const expanded = {name: value.name, message: value.message, stack: value.stack};
    if (value.cause !== undefined) expanded.cause = redact(value.cause, seen);
    seen.delete(value);
    return expanded;
  }
  if (typeof value === 'string') return truncateDataUri(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  const redacted = Array.isArray(value)
    ? value.map((item) => redact(item, seen))
    : Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SECRET_KEY.test(key) && typeof item !== 'boolean' ? REDACTED : redact(item, seen),
      ])
    );
  seen.delete(value);
  return redacted;
}

function emit(level, msg, fields) {
  if (LEVELS[level] > currentLevel()) return;
  const ts = new Date().toISOString();
  let line;
  try {
    line = JSON.stringify({ts, level, msg, ...redact(fields ?? {})});
  } catch (error) {
    line = JSON.stringify({ts, level, msg, log_error: `unserializable fields: ${error.message}`});
  }
  process.stderr.write(`${line}\n`);
}

export const logger = {
  error: (msg, fields) => emit('error', msg, fields),
  warn: (msg, fields) => emit('warn', msg, fields),
  info: (msg, fields) => emit('info', msg, fields),
  debug: (msg, fields) => emit('debug', msg, fields),
};

export function logOutgoingMessages(transport) {
  const send = transport.send.bind(transport);
  transport.send = async (message, options) => {
    if (message?.error) logger.warn('protocol.error', {id: message.id, error: message.error});
    else if (message?.result?.isError) logger.warn('tool.result.error', {id: message.id, content: message.result.content});
    else logger.debug('protocol.send', {message});
    return send(message, options);
  };
  return transport;
}
