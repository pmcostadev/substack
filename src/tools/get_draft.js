import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const getDraftSchema = z.strictObject({draft_id: z.number().int().describe("The numeric id of the draft.")});

export const getDraftHandler = async (args) => {
  logger.debug('get_draft.start', {args});
  let validatedArgs;
  try { validatedArgs = getDraftSchema.parse(args); } catch (error) { logger.error('get_draft.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {draft_id} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const draft = await substack_api.getDraft(draft_id);
  logger.info('get_draft.done', {draft_id, is_published: draft?.is_published ?? null, has_body: Boolean(draft?.draft_body)});
  return draft;
};
