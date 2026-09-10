import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const POST_STAT_FIELDS = ['post_id','title','post_date','audience','type','section_id','section_name','tags','bylines','queued','sent','delivered','dropped','opens','opened','open_rate','clicks','clicked','click_through_rate','views','subscribers_finished_post','signups','subscribes','founding_subscribes','annual_subscribes','monthly_subscribes','free_trials','free_to_paid_upgrades','signups_within_1_day','subscriptions_within_1_day','estimated_value','unsubscribes','likes','shares','restacks','engagement_rate','unique_engagements','video_views','video_minutes_watched','downloads','downloads_day30','podcast_preview_downloads','podcast_preview_downloads_day30'];

export const getPostStatsSchema = z.strictObject({
  order_by: z.enum(POST_STAT_FIELDS).optional().describe("Which metric to rank by, defaulting to post_date."),
  order_direction: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getPostStatsHandler = async (args) => {
  logger.debug('get_post_stats.start', {args});
  let validatedArgs;
  try { validatedArgs = getPostStatsSchema.parse(args); } catch (error) { logger.error('get_post_stats.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {order_by = 'post_date', order_direction = 'desc', limit = 25, offset = 0} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const response = await substack_api.request({method: 'GET', path: '/publication/stats/email_stats', params: {offset, limit, order_by, order_direction}, referer: '/publish/stats/emails'});
  const posts = response?.rows ?? [];
  return {total: response?.total ?? null, returned: posts.length, limit, offset, order_by, order_direction, posts};
};
