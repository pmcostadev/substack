import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const deleteDraftSchema = z.strictObject({draft_id: z.number().int().describe("The numeric id of the draft to delete.")});

export const deleteDraftHandler = async (args) => {
  logger.debug('delete_draft.start', {args});
  let validatedArgs;
  try { validatedArgs = deleteDraftSchema.parse(args); } catch (error) { logger.error('delete_draft.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {draft_id} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const draft = await substack_api.getDraft(draft_id);
  if (draft?.is_published) { logger.error('delete_draft.refused_published', {draft_id}); throw new Error(`Draft ${draft_id} is a published post, not a draft. delete_draft only removes unpublished drafts.`); }
  await substack_api.deleteDraft(draft_id);
  logger.info('delete_draft.done', {draft_id, title: draft?.draft_title ?? null});
  return {status: 'deleted', draft_id, draft_title: draft?.draft_title ?? null};
};
