import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";
import {buildSubscriberQuery, OPERATORS_BY_TYPE, SUBSCRIBER_COLUMNS, SUBSCRIBER_COLUMN_NAMES} from "../api/substack/SubscriberQuery.js";

const OPERATOR_NAMES = [...new Set(Object.values(OPERATORS_BY_TYPE).flatMap((operators) => Object.keys(operators)))];
const COLUMN_REFERENCE = Object.entries(SUBSCRIBER_COLUMNS).map(([column, {type, label}]) => `${column} (${type}) = ${label}`).join('; ');
const OPERATOR_REFERENCE = Object.entries(OPERATORS_BY_TYPE).map(([type, operators]) => `${type}: ${Object.keys(operators).join(', ')}`).join('. ');

export const listSubscribersSchema = z.strictObject({
  filters: z.array(z.strictObject({column: z.enum(SUBSCRIBER_COLUMN_NAMES).describe(`The column to filter on. ${COLUMN_REFERENCE}`), operator: z.enum(OPERATOR_NAMES).describe(`How to compare. ${OPERATOR_REFERENCE}`), value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])})).optional().describe("Conditions to apply, combined with AND."),
  search: z.string().optional().describe("Free-text search over subscriber name and email."),
  sort_by: z.enum(SUBSCRIBER_COLUMN_NAMES).optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).optional().describe("1-100, defaulting to 25."),
  offset: z.number().int().min(0).optional(),
});

export const listSubscribersHandler = async (args) => {
  logger.debug('list_subscribers.start', {args});
  let validatedArgs;
  try { validatedArgs = listSubscribersSchema.parse(args); } catch (error) { logger.error('list_subscribers.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  let query;
  try { query = buildSubscriberQuery(validatedArgs); } catch (error) { logger.error('list_subscribers.query.invalid', {args: validatedArgs, error}); throw error; }
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const response = await substack_api.getSubscribers(query);
  const subscribers = response?.subscribers ?? [];
  logger.info('list_subscribers.done', {count: response?.count ?? null, returned: subscribers.length});
  return {count: response?.count ?? null, returned: subscribers.length, limit: query.limit, offset: query.offset, subscribers};
};
