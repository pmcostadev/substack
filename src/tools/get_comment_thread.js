import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {summarizeComment} from "../api/substack/comment.js";
import {logger} from "../logger.js";

export const getCommentThreadSchema = z.strictObject({
  comment_id: z.number().int().describe("The numeric id of a Note or comment."),
  include_replies: z.boolean().default(true),
});

export const getCommentThreadHandler = async (args) => {
  logger.debug('get_comment_thread.start', {args});
  let validatedArgs;
  try { validatedArgs = getCommentThreadSchema.parse(args); } catch (error) { logger.error('get_comment_thread.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {comment_id, include_replies} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const [detail, replies] = await Promise.all([substack_api.getComment(comment_id), include_replies ? substack_api.getCommentReplies(comment_id) : Promise.resolve(null)]);
  const comment = summarizeComment(detail?.item?.comment ?? detail?.item ?? null);
  if (!comment?.id) throw new Error(`Comment ${comment_id} was not found.`);
  const branches = (replies?.commentBranches ?? []).map((branch) => ({reply: summarizeComment(branch?.comment), descendants: (branch?.descendantComments ?? []).map(summarizeComment).filter(Boolean)})).filter((b) => b.reply);
  const replyCount = branches.reduce((total, b) => total + 1 + b.descendants.length, 0);
  return {comment, ...(include_replies ? {replies_returned: replyCount, branch_count: branches.length, more_branches: Boolean(replies?.moreBranches), next_cursor: replies?.nextCursor ?? null, branches} : {})};
};
