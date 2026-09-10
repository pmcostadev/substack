import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

const MAX_PAGES = 20;

export const listSubscriptionsSchema = z.strictObject({
  limit: z.number().int().min(1).max(500).default(100).describe("How many subscriptions to return."),
  active_only: z.boolean().default(true).describe("Exclude paused and expired."),
});

function isActive(subscription) {
  if (!subscription) return false; if (subscription.paused) return false;
  if (!subscription.expiry) return true;
  const expiry = new Date(subscription.expiry);
  return Number.isNaN(expiry.getTime()) || expiry > new Date();
}

export const listSubscriptionsHandler = async (args) => {
  logger.debug('list_subscriptions.start', {args});
  let validatedArgs;
  try { validatedArgs = listSubscriptionsSchema.parse(args); } catch (error) { logger.error('list_subscriptions.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {limit, active_only} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const byPublication = new Map(); const seenCursors = new Set(); let cursor = null; let pages = 0; let skippedInactive = 0;
  while (pages < MAX_PAGES && byPublication.size < limit) {
    const page = await substack_api.listSubscriptions({cursor, limit: 100}); pages += 1;
    for (const item of page?.items ?? []) {
      if (item?.type !== 'subscription') continue; if (!item.pub?.id || !item.subscription?.id) continue;
      if (active_only && !isActive(item.subscription)) { skippedInactive += 1; continue; }
      const subdomain = item.pub.subdomain ?? String(item.pub.id);
      byPublication.set(Number(item.pub.id), {subscription_id: Number(item.subscription.id), publication_id: Number(item.pub.id), name: item.pub.name ?? subdomain, author: item.primaryProfile?.name ?? item.pub.author_name ?? null, subdomain, url: item.pub.custom_domain ?? item.pub.base_url ?? `https://${subdomain}.substack.com`, membership_state: item.subscription.membership_state ?? null, type: item.subscription.type ?? null, is_founding: Boolean(item.subscription.is_founding), is_favorite: Boolean(item.subscription.is_favorite), paused: Boolean(item.subscription.paused), expires_at: item.subscription.expiry ?? null, emails_disabled: Boolean(item.subscription.email_disabled)});
      if (byPublication.size >= limit) break;
    }
    cursor = page?.nextCursor ?? null; if (!cursor) break;
    if (seenCursors.has(cursor)) break; seenCursors.add(cursor);
  }
  const subscriptions = [...byPublication.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
  const truncated = pages >= MAX_PAGES && Boolean(cursor);
  return {returned: subscriptions.length, pages_fetched: pages, ...(active_only && skippedInactive ? {skipped_inactive: skippedInactive} : {}), ...(truncated ? {truncated: true} : {more: Boolean(cursor) && subscriptions.length >= limit}), subscriptions};
};
