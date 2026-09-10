import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const getReaderPostSchema = z.strictObject({
  post_id: z.number().int().describe("The numeric id of the post. Works for any publication."),
  include_body: z.boolean().default(true).describe("Include the post body as HTML."),
});

export const getReaderPostHandler = async (args) => {
  logger.debug('get_reader_post.start', {args});
  let validatedArgs;
  try { validatedArgs = getReaderPostSchema.parse(args); } catch (error) { logger.error('get_reader_post.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {post_id, include_body} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const {post, publication} = (await substack_api.getPostById(post_id)) ?? {};
  if (!post?.id) throw new Error(`Substack post ${post_id} was not found.`);
  return {id: post.id, title: post.title ?? null, subtitle: post.subtitle ?? null, author: (post.publishedBylines ?? []).map((b) => b?.name).filter(Boolean).join(', ') || null, publication: publication?.name ?? null, publication_id: publication?.id ?? null, published_at: post.post_date ?? null, url: post.canonical_url ?? null, audience: post.audience ?? null, wordcount: post.wordcount ?? null, reactions: post.reaction_count ?? 0, comments: post.comment_count ?? 0, restacks: post.restacks ?? 0, ...(include_body ? {body_html: post.body_html ?? null} : {}), preview_text: post.truncated_body_text ?? null, body_truncated: include_body ? Boolean(!post.body_html && post.truncated_body_text) : null};
};
