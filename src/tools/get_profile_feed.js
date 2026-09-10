import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {summarizeFeed} from "../api/substack/feed.js";
import {logger} from "../logger.js";

export const getProfileFeedSchema = z.strictObject({
  user_id: z.number().int().optional().describe("Whose profile to read. Defaults to your own."),
  type: z.enum(['all', 'notes', 'posts']).default('all'),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

export const getProfileFeedHandler = async (args) => {
  logger.debug('get_profile_feed.start', {args});
  let validatedArgs;
  try { validatedArgs = getProfileFeedSchema.parse(args); } catch (error) { logger.error('get_profile_feed.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {user_id, type, limit, cursor} = validatedArgs;
  const resolvedUserId = user_id ?? Number(process.env.SUBSTACK_USER_ID);
  if (!Number.isFinite(resolvedUserId) || resolvedUserId <= 0) throw new Error('user_id is required when SUBSTACK_USER_ID is not set.');
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const feed = await substack_api.getProfileFeed(resolvedUserId, {cursor: cursor ?? null, limit});
  const summary = summarizeFeed(feed);
  const wanted = {notes: 'note', posts: 'post'}[type];
  const items = (wanted ? summary.items.filter((item) => item.type === wanted) : summary.items).slice(0, limit);
  return {user_id: resolvedUserId, type, returned: items.length, ...(wanted && summary.items.length !== items.length ? {read_from_profile: summary.items.length} : {}), ...(summary.non_content_items_skipped ? {non_content_items_skipped: summary.non_content_items_skipped} : {}), next_cursor: summary.next_cursor, items};
};
