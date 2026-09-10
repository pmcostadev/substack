import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";
import {parseCsv} from "../api/substack/csv.js";
import {buildSubscriberQuery, COLUMN_KEY_BY_LABEL, SUBSCRIBER_COLUMNS, SUBSCRIBER_COLUMN_NAMES} from "../api/substack/SubscriberQuery.js";

export const EXPORT_POLL_BACKOFF_SECONDS = [1, 5, 10, 30, 60];
const DEFAULT_MAX_WAIT_SECONDS = 120;
const sleepSeconds = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const COLUMN_REFERENCE = Object.entries(SUBSCRIBER_COLUMNS).map(([column, {label}]) => `${column} = ${label}`).join('; ');

export const exportSubscribersSchema = z.strictObject({
  filters: z.array(z.strictObject({column: z.enum(SUBSCRIBER_COLUMN_NAMES), operator: z.string(), value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])})).optional(),
  search: z.string().optional(),
  columns: z.array(z.enum(SUBSCRIBER_COLUMN_NAMES)).optional().describe(`Which columns to include. Available: ${COLUMN_REFERENCE}`),
  max_wait_seconds: z.number().int().min(1).max(600).optional().describe("How long to wait, 1-600, defaulting to 120."),
});

function recordsFromCsv(csv) {
  const {header, rows} = parseCsv(csv);
  const keys = header.map((label) => COLUMN_KEY_BY_LABEL[label] ?? label);
  const unmapped = header.filter((label) => !COLUMN_KEY_BY_LABEL[label]);
  const subscribers = rows.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] ?? null])));
  return {columns: keys.filter((key) => !unmapped.includes(key)), unmapped, subscribers};
}

export const exportSubscribersHandler = async (args, {sleep = sleepSeconds} = {}) => {
  logger.debug('export_subscribers.start', {args});
  let validatedArgs;
  try { validatedArgs = exportSubscribersSchema.parse(args); } catch (error) { logger.error('export_subscribers.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {filters = [], search = null, columns = SUBSCRIBER_COLUMN_NAMES, max_wait_seconds = DEFAULT_MAX_WAIT_SECONDS} = validatedArgs;
  let query;
  try { ({filters: query} = buildSubscriberQuery({filters, search})); } catch (error) { logger.error('export_subscribers.query.invalid', {args: validatedArgs, error}); throw error; }
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const set = await substack_api.createSubscriberSet(query);
  const requested = await substack_api.requestSubscriberSetExport({subscriber_set_id: set?.id, columns});
  const export_id = requested?.export_id ?? null;
  let waited = 0; let url = null;
  for (let attempt = 0; ; attempt++) {
    const status = await substack_api.getSubscriberSetExport(export_id);
    if (status?.url) { url = status.url; break; }
    const delay = EXPORT_POLL_BACKOFF_SECONDS[Math.min(attempt, EXPORT_POLL_BACKOFF_SECONDS.length - 1)];
    if (waited + delay > max_wait_seconds) throw new Error(`Export ${export_id} is not ready after ${waited}s.`);
    await sleep(delay); waited += delay;
  }
  const csv = await substack_api.downloadExport(url);
  const {columns: returned, unmapped, subscribers} = recordsFromCsv(csv);
  const missing_columns = columns.filter((column) => !returned.includes(column));
  return {count: subscribers.length, columns: returned, missing_columns, unmapped_columns: unmapped, export_id, subscribers};
};
