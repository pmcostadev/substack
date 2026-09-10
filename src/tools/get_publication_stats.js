import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

const PARTS = {summary: '/publish-dashboard/summary', open_rate: '/publication/stats/email_stats/30d_open_rate', views_30d: '/publication/stats/publication_traffic/30d_views'};

export const getPublicationStatsSchema = z.strictObject({});

export const getPublicationStatsHandler = async (args) => {
  logger.debug('get_publication_stats.start', {args});
  let validatedArgs;
  try { validatedArgs = getPublicationStatsSchema.parse(args); } catch (error) { logger.error('get_publication_stats.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const names = Object.keys(PARTS);
  const settled = await Promise.allSettled(names.map((name) => substack_api.request({method: 'GET', path: PARTS[name]})));
  const parts = {}; const errors = {};
  settled.forEach((outcome, index) => { const name = names[index]; if (outcome.status === 'fulfilled') parts[name] = outcome.value; else { errors[name] = outcome.reason?.message ?? String(outcome.reason); logger.warn('get_publication_stats.part.failed', {part: name, error: outcome.reason}); } });
  const {summary = null, open_rate = null, views_30d = null} = parts;
  return {subscribers: summary?.subscribers ?? null, subscribers_last_30_days: summary?.subscribersLast30Days ?? null, email_subscribers: summary?.totalEmail ?? null, email_subscribers_last_30_days: summary?.totalEmailLast30Days ?? null, app_subscribers: summary?.appSubscribers ?? null, arr: summary?.arr ?? null, arr_change: summary?.arrDelta ?? null, views: summary?.views ?? null, views_change: summary?.viewsDelta ?? null, open_rate_30d: open_rate?.openRate ?? null, open_rate_30d_change: open_rate?.openRateDiff ?? null, views_30d: views_30d?.views30d ?? null, views_30d_change: views_30d?.viewsDelta30d ?? null, ...(Object.keys(errors).length > 0 ? {errors} : {})};
};
