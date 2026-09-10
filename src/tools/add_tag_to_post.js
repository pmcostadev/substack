import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const addTagToPostSchema = z.strictObject({
  post_id: z.number().int().describe("The numeric id of the post to tag."),
  tag_name: z.string().min(1).describe("The tag to add, by name."),
  create_if_missing: z.boolean().default(true).describe("Create the tag if it does not exist."),
});

export const addTagToPostHandler = async (args) => {
  logger.debug('add_tag_to_post.start', {args});
  let validatedArgs;
  try { validatedArgs = addTagToPostSchema.parse(args); } catch (error) { logger.error('add_tag_to_post.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {post_id, tag_name, create_if_missing} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const tags = await substack_api.getPostTags();
  const wanted = tag_name.trim().toLowerCase();
  let tag = (tags ?? []).find((c) => c?.name?.trim().toLowerCase() === wanted);
  let created = false;
  if (!tag) {
    if (!create_if_missing) throw new Error(`No tag named "${tag_name}" exists and create_if_missing is false.`);
    tag = await substack_api.createPostTag(tag_name); created = true;
  }
  const existing = await substack_api.getTagsForPost(post_id);
  if ((existing ?? []).some((a) => a?.post_tag_id === tag?.id)) return {status: 'already_tagged', post_id, tag: {id: tag?.id ?? null, name: tag?.name ?? tag_name}, tag_created: created};
  const association = await substack_api.addTagToPost(post_id, tag.id);
  return {status: 'tagged', post_id, tag: {id: tag?.id ?? null, name: tag?.name ?? tag_name}, tag_created: created, association_id: association?.id ?? null};
};
