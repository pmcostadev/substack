import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {summarizeComment} from "../api/substack/comment.js";
import {logger} from "../logger.js";

export const getPostCommentsSchema = z.strictObject({
  post_id: z.number().int().describe("The numeric id of one of your posts."),
  limit: z.number().int().min(1).max(100).default(50).describe("How many comments to return."),
});

export const getPostCommentsHandler = async (args) => {
  logger.debug('get_post_comments.start', {args});
  let validatedArgs;
  try { validatedArgs = getPostCommentsSchema.parse(args); } catch (error) { logger.error('get_post_comments.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {post_id, limit} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const data = await substack_api.getPostComments(post_id, {limit});
  const comments = (data?.comments ?? []).map(summarizeComment).filter(Boolean);
  const hidden = (data?.automod_hidden_comments ?? []).length;
  return {post_id, returned: comments.length, automod_hidden_count: hidden, comments};
};
