import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const getPostTagsSchema = z.strictObject({post_id: z.number().int().describe("The numeric id of the post.")});

export const getPostTagsHandler = async (args) => {
  logger.debug('get_post_tags.start', {args});
  let validatedArgs;
  try { validatedArgs = getPostTagsSchema.parse(args); } catch (error) { logger.error('get_post_tags.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {post_id} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const [associations, tags] = await Promise.all([substack_api.getTagsForPost(post_id), substack_api.getPostTags()]);
  const tagById = new Map((tags ?? []).map((tag) => [tag?.id, tag]));
  const resolved = (associations ?? []).map((association) => {
    const tag = tagById.get(association?.post_tag_id);
    return {post_tag_id: association?.post_tag_id ?? null, name: tag?.name ?? null, slug: tag?.slug ?? null, hidden: tag ? Boolean(tag.hidden) : null, association_id: association?.id ?? null, ...(tag ? {} : {unresolved: true})};
  });
  const unresolved = resolved.filter((tag) => tag.unresolved).length;
  return {post_id, count: resolved.length, tags: resolved, ...(unresolved ? {warning: `${unresolved} tag(s) could not be resolved.`} : {})};
};
