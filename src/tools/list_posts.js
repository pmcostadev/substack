import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

const SORT_BY_STATUS = {
  drafts: {order_by: 'draft_updated_at', order_direction: 'desc'},
  published: {order_by: 'post_date', order_direction: 'desc'},
  scheduled: {order_by: 'trigger_at', order_direction: 'asc'},
};

const PROJECTED_FIELDS = ['id','uuid','type','title','draft_title','subtitle','draft_subtitle','slug','audience','is_published','post_date','trigger_at','draft_created_at','draft_updated_at','email_sent_at','should_send_email','section_id','section_name','draft_section_name','cover_image','reaction_count','comment_count','stats'];
function project(post) { const projected = {}; for (const field of PROJECTED_FIELDS) { if (post[field] !== undefined) projected[field] = post[field]; } return projected; }

export const listPostsSchema = z.strictObject({
  status: z.enum(['drafts', 'published', 'scheduled']).describe("Which list to read."),
  search: z.string().optional().describe("Free-text search over the posts."),
  limit: z.number().int().min(1).max(100).optional().describe("How many posts to return, 1-100, defaulting to 25."),
  offset: z.number().int().min(0).optional().describe("How many posts to skip."),
  sort_direction: z.enum(['asc', 'desc']).optional().describe("Overrides the default order."),
});

export const listPostsHandler = async (args) => {
  logger.debug('list_posts.start', {args});
  let validatedArgs;
  try { validatedArgs = listPostsSchema.parse(args); } catch (error) { logger.error('list_posts.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {status, search = null, limit = 25, offset = 0, sort_direction = null} = validatedArgs;
  const defaults = SORT_BY_STATUS[status];
  const order_by = defaults.order_by;
  const order_direction = sort_direction ?? defaults.order_direction;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const response = await substack_api.getPosts({status, limit, offset, order_by, order_direction, query: search});
  const posts = response?.posts ?? [];
  logger.info('list_posts.done', {status, total: response?.total ?? null, returned: posts.length});
  return {status, total: response?.total ?? null, returned: posts.length, limit, offset, posts: posts.map(project)};
};
