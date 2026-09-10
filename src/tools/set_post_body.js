import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {postBodySchema, summarizeNodes} from "../api/substack/document.js";
import {logger} from "../logger.js";

export const setPostBodySchema = z.strictObject({
  draft_id: z.number().int().describe("The numeric id of the draft to write."),
  body: postBodySchema,
});

export const setPostBodyHandler = async (args) => {
  logger.debug('set_post_body.start', {args});
  let validatedArgs;
  try { validatedArgs = setPostBodySchema.parse(args); } catch (error) { logger.error('set_post_body.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {draft_id, body} = validatedArgs;
  const nodes = summarizeNodes(body);
  logger.info('set_post_body.writing', {draft_id, nodes});
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  await substack_api.updateDraft(draft_id, {draft_body: JSON.stringify(body)});
  logger.info('set_post_body.done', {draft_id, nodes});
  return {draft_id, nodes};
};
