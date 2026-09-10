import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const ANALYTICS_REPORTS = {
  unsubscribes: {path: '/publication/stats/unsubscribes', window: 'date', description: 'Unsubscribes in a window.'},
  unsubscribes_timeseries: {path: '/publication/stats/unsubscribes/timeseries', window: 'date', description: 'Unsubscribes over time.'},
  retention: {path: '/publication/stats/subscriber_retention', window: 'iso', params: {months: 12, is_subscribed: false}, description: 'Cohort retention.'},
  retention_summary: {path: '/publication/stats/subscriber_retention/summary', params: {is_subscribed: false}, description: 'Headline retention rates.'},
  referrals_leaderboard: {path: '/publication/stats/referrals/leaderboard', description: 'Top referrers.'},
  referrals_summary: {path: '/publication/stats/referrals/summary', description: 'Gifts sent, accepted and converted.'},
  audience_overlap: {path: '/publication/stats/audience_insights/overlap', limit: 6, description: 'Audience overlap with other Substacks.'},
  audience_locations: {path: '/publication/stats/audience_insights/location/total', description: 'Subscriber countries and states.'},
  subscriber_notes: {path: '/publication/stats/subscriber_notes', limit: 8, description: 'Recent Notes by subscribers.'},
  paid_subscriber_growth: {path: '/publication/stats/paid_subscriber_growth/summary', description: 'Paid growth rate.'},
  arr_timeseries: {path: '/publication/stats/arr/timeseries', description: 'ARR over time.'},
  followers_timeseries: {path: '/publication/stats/followers/timeseries', description: 'Follower count over time.'},
  subscribers_timeseries: {path: '/publication/stats/subscribers/timeseries', params: {period: 'month'}, description: 'Subscriber count over time.'},
  growth_sources: {path: '/publication/stats/growth/sources', window: 'date', params: {order_by: 'users', order_direction: 'desc'}, description: 'Where new subscribers came from.'},
  growth_events: {path: '/publication/stats/growth/events', window: 'date', description: 'Individual growth events.'},
  network_attribution: {path: '/publication/stats/network_attribution', params: {time_window: '90 days', is_subscribed: false}, description: 'Substack network attribution.'},
};

const REPORT_NAMES = Object.keys(ANALYTICS_REPORTS);
const DEFAULT_WINDOW_DAYS = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REPORT_REFERENCE = Object.entries(ANALYTICS_REPORTS).map(([name, {description}]) => `${name} — ${description}`).join(' ');
const asDate = (date) => date.toISOString().slice(0, 10);
const daysBefore = (date, days) => new Date(date.getTime() - days * 86400000);
function yearBefore(date) { const shifted = new Date(date); shifted.setUTCFullYear(shifted.getUTCFullYear() - 1); return shifted; }

export const getAnalyticsSchema = z.strictObject({
  report: z.enum(REPORT_NAMES).describe(`Which report to read. ${REPORT_REFERENCE}`),
  from_date: z.string().regex(DATE_PATTERN, 'from_date must be YYYY-MM-DD').optional(),
  to_date: z.string().regex(DATE_PATTERN, 'to_date must be YYYY-MM-DD').optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

function resolveParams(report, {from_date, to_date, limit}, now) {
  const definition = ANALYTICS_REPORTS[report];
  const params = {...(definition.params ?? {})};
  const ignored = [];
  if (definition.window) {
    const to = to_date ?? asDate(now);
    const from = from_date ?? asDate(definition.window === 'iso' ? yearBefore(now) : daysBefore(now, DEFAULT_WINDOW_DAYS));
    if (definition.window === 'iso') { params.start = `${from}T00:00:00.000Z`; params.end = `${to}T00:00:00.000Z`; }
    else { params.from_date = from; params.to_date = to; }
  } else { if (from_date !== undefined) ignored.push('from_date'); if (to_date !== undefined) ignored.push('to_date'); }
  if (definition.limit !== undefined) params.limit = limit ?? definition.limit;
  else if (limit !== undefined) ignored.push('limit');
  return {params, ignored};
}

export const getAnalyticsHandler = async (args, {now = () => new Date()} = {}) => {
  logger.debug('get_analytics.start', {args});
  let validatedArgs;
  try { validatedArgs = getAnalyticsSchema.parse(args); } catch (error) { logger.error('get_analytics.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {report} = validatedArgs;
  const {path} = ANALYTICS_REPORTS[report];
  const {params, ignored} = resolveParams(report, validatedArgs, now());
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const data = await substack_api.request({method: 'GET', path, params, referer: '/publish/stats'});
  return {report, params, ignored_params: ignored, data};
};
