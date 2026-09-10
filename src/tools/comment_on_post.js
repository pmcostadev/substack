import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {summarizeComment} from "../api/substack/comment.js";
import {logger} from "../logger.js";

export const commentOnPostSchema = z.strictObject({
  post_id: z.number().int().describe("The numeric id of one of your posts."),
  body: z.string().min(1).describe("The comment text."),
});

export const commentOnPostHandler = async (args) => {
  logger.debug('comment_on_post.start', {args});
  let validatedArgs;
  try { validatedArgs = commentOnPostSchema.parse(args); } catch (error) { logger.error('comment_on_post.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {post_id, body} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  logger.info('comment_on_post.posting', {post_id, body});
  const comment = await substack_api.commentOnPost(post_id, body);
  return {status: 'posted', post_id, comment: summarizeComment(comment)};
};
