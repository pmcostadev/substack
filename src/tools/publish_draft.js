import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const publishDraftSchema = z.strictObject({
  draft_id: z.number().int().describe("The numeric id of the draft to publish."),
  send: z.boolean().default(false).describe("Whether to email the post to subscribers. Defaults to false."),
});

export const publishDraftHandler = async (args) => {
  logger.debug('publish_draft.start', {args});
  let validatedArgs;
  try { validatedArgs = publishDraftSchema.parse(args); } catch (error) { logger.error('publish_draft.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {draft_id, send} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  logger.info('publish_draft.setting_email_intent', {draft_id, should_send_email: send});
  await substack_api.updateDraft(draft_id, {should_send_email: send});
  logger.info('publish_draft.publishing', {draft_id, send});
  const post = await substack_api.publishDraft(draft_id, {send});
  logger.info('publish_draft.done', {draft_id, post_id: post?.id ?? null, emailed: send});
  return {status: 'published', draft_id, post_id: post?.id ?? null, title: post?.title ?? post?.draft_title ?? null, slug: post?.slug ?? null, canonical_url: post?.canonical_url ?? null, emailed: send, email_sent_at: post?.email_sent_at ?? null};
};
