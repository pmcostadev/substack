import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {summarizeFeed} from "../api/substack/feed.js";
import {logger} from "../logger.js";

export const getReaderFeedSchema = z.strictObject({
  tab: z.string().default('for-you').describe("Feed tab id."),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
  include_tabs: z.boolean().default(false).describe("Also return available feed tabs."),
});

export const getReaderFeedHandler = async (args) => {
  logger.debug('get_reader_feed.start', {args});
  let validatedArgs;
  try { validatedArgs = getReaderFeedSchema.parse(args); } catch (error) { logger.error('get_reader_feed.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {tab, limit, cursor, include_tabs} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const [feed, tabs] = await Promise.all([substack_api.getReaderFeed({tab, cursor: cursor ?? null, limit}), include_tabs ? substack_api.getReaderFeedTabs() : Promise.resolve(null)]);
  const summary = summarizeFeed(feed, {limit});
  return {tab, ...summary, ...(tabs ? {available_tabs: (tabs?.tabs ?? []).map((e) => ({id: e?.id ?? null, name: e?.name ?? null, type: e?.type ?? null}))} : {})};
};
