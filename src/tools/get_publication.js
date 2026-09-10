import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

const SUMMARY_FIELDS = ['id','name','subdomain','custom_domain','hero_text','copyright','email_from_name','logo_url','cover_photo_url','author_name','created_at','language','payments_state','plans','community_enabled','moderation_enabled','podcast_enabled','is_personal_mode','invite_only','paused'];

export const getPublicationSchema = z.strictObject({full: z.boolean().default(false).describe("Return all 111 fields. Defaults to false.")});

export const getPublicationHandler = async (args) => {
  logger.debug('get_publication.start', {args});
  let validatedArgs;
  try { validatedArgs = getPublicationSchema.parse(args); } catch (error) { logger.error('get_publication.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {full} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const publication = await substack_api.getPublication();
  if (full) return publication;
  const summary = {}; const missing = [];
  for (const field of SUMMARY_FIELDS) { if (publication && field in publication) summary[field] = publication[field]; else missing.push(field); }
  return {...summary, _meta: {projected: true, returned_fields: Object.keys(summary).length, available_fields: Object.keys(publication ?? {}).length, ...(missing.length ? {fields_not_returned_by_api: missing} : {}), hint: 'Pass full: true for the complete payload.'}};
};
