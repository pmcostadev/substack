import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const listPublicationTagsSchema = z.strictObject({include_hidden: z.boolean().default(true).describe("Include hidden tags. Defaults to true.")});

export const listPublicationTagsHandler = async (args) => {
  logger.debug('list_publication_tags.start', {args});
  let validatedArgs;
  try { validatedArgs = listPublicationTagsSchema.parse(args); } catch (error) { logger.error('list_publication_tags.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {include_hidden} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const tags = await substack_api.getPostTags();
  const visible = include_hidden ? tags : tags.filter((tag) => !tag?.hidden);
  return {total: tags.length, returned: visible.length, tags: visible.map((tag) => ({id: tag?.id ?? null, name: tag?.name ?? null, slug: tag?.slug ?? null, hidden: Boolean(tag?.hidden)}))};
};
