import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {fetchImageAsDataUri, defaultLookup, isSubstackHosted} from "../api/substack/image.js";
import {logger} from "../logger.js";

export const updateDraftSchema = z.strictObject({
  draft_id: z.number().int().describe("The numeric id of the draft to update."),
  draft_title: z.string().optional().describe("New title."),
  draft_subtitle: z.string().optional().describe("New subtitle."),
  audience: z.enum(['everyone', 'only_paid', 'only_free', 'founding']).optional().describe("Who the post is for."),
  write_comment_permissions: z.enum(['everyone', 'subscribers', 'only_paid', 'none']).optional().describe("Who may comment."),
  default_comment_sort: z.enum(['best_first', 'most_recent_first', 'oldest_first']).optional().describe("Comment order."),
  cover_image: z.string().url().optional().describe("Cover image URL. External URLs are re-hosted on Substack."),
  social_title: z.string().optional().describe("Social preview title."),
  description: z.string().optional().describe("Social preview description."),
  search_engine_title: z.string().optional().describe("SEO title."),
  search_engine_description: z.string().optional().describe("SEO description."),
  slug: z.string().optional().describe("URL slug."),
});

const SETTABLE_FIELDS = Object.keys(updateDraftSchema.shape).filter((name) => name !== 'draft_id');

export const updateDraftHandler = async (args, {lookup = defaultLookup, fetchImpl = fetch} = {}) => {
  logger.debug('update_draft.start', {args});
  let validatedArgs;
  try { validatedArgs = updateDraftSchema.parse(args); } catch (error) { logger.error('update_draft.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {draft_id, ...fields} = validatedArgs;
  if (Object.keys(fields).length === 0) { logger.error('update_draft.no_fields', {draft_id}); throw new Error(`No fields to update. Provide at least one of: ${SETTABLE_FIELDS.join(', ')}.`); }
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  let cover_rehosted_from = null;
  if (fields.cover_image !== undefined && !isSubstackHosted(fields.cover_image)) {
    const source = fields.cover_image;
    logger.info('update_draft.cover_image.fetching', {draft_id, url: source});
    const {image, contentType, bytes} = await fetchImageAsDataUri(source, {lookup, fetchImpl});
    logger.info('update_draft.cover_image.uploading', {draft_id, content_type: contentType, bytes});
    const uploaded = await substack_api.uploadImage({image, post_id: null});
    fields.cover_image = uploaded.url;
    cover_rehosted_from = source;
  }
  const draft = await substack_api.updateDraft(draft_id, fields);
  logger.info('update_draft.done', {draft_id, updated_fields: Object.keys(fields)});
  return {draft_id, updated_fields: Object.keys(fields), draft_title: draft?.draft_title ?? null, draft_subtitle: draft?.draft_subtitle ?? null, audience: draft?.audience ?? null, is_published: draft?.is_published ?? null, cover_image: fields.cover_image ?? draft?.cover_image ?? null, cover_image_rehosted_from: cover_rehosted_from};
};
