import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const listReaderPostsSchema = z.strictObject({
  limit: z.number().int().min(1).max(100).default(20),
  after: z.string().min(1).optional().describe("Resume from next_after of a previous response."),
});

export const listReaderPostsHandler = async (args) => {
  logger.debug('list_reader_posts.start', {args});
  let validatedArgs;
  try { validatedArgs = listReaderPostsSchema.parse(args); } catch (error) { logger.error('list_reader_posts.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {limit, after} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const page = await substack_api.listReaderPosts({limit, after: after ?? null});
  const publications = new Map((page?.publications ?? []).filter((p) => p?.id).map((p) => [Number(p.id), p]));
  const posts = (page?.posts ?? []).map((post) => {
    const pub = publications.get(Number(post?.publication_id)) ?? {};
    return {id: post?.id ?? null, title: post?.title ?? null, subtitle: post?.subtitle ?? null, publication: pub.name ?? null, publication_id: post?.publication_id ?? null, author: (post?.publishedBylines ?? []).map((b) => b?.name).filter(Boolean).join(', ') || null, published_at: post?.post_date ?? null, audience: post?.audience ?? null, type: post?.type ?? null, url: post?.canonical_url ?? null, wordcount: post?.wordcount ?? null, reactions: post?.reaction_count ?? 0, comments: post?.comment_count ?? 0, restacks: post?.restacks ?? 0, is_read: Boolean(post?.is_viewed), read_progress: post?.read_progress ?? null, is_saved: Boolean(post?.is_saved)};
  });
  const nextAfter = (page?.inboxItems ?? []).at(-1)?.content_date ?? null;
  const hasMore = Boolean(page?.more && nextAfter);
  return {returned: posts.length, more: hasMore, ...(hasMore ? {next_after: nextAfter} : {}), posts};
};
