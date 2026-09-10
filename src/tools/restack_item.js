import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const restackItemSchema = z.strictObject({
  comment_id: z.number().int().describe("The numeric id of the Note to restack."),
  tab_id: z.string().default('for-you'),
});

export const restackItemHandler = async (args) => {
  logger.debug('restack_item.start', {args});
  let validatedArgs;
  try { validatedArgs = restackItemSchema.parse(args); } catch (error) { logger.error('restack_item.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {comment_id, tab_id} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  logger.info('restack_item.restacking', {comment_id, tab_id});
  const result = await substack_api.restackNote(comment_id, {tab_id});
  return {status: 'restacked', comment_id, restack_id: result?.id ?? null, note: 'A restack cannot be undone through this server.'};
};
