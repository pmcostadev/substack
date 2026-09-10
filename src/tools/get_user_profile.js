import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {logger} from "../logger.js";

export const getUserProfileSchema = z.strictObject({full: z.boolean().default(false).describe("Return full payload including subscriptions.")});

export const getUserProfileHandler = async (args) => {
  logger.debug('get_user_profile.start', {args});
  let validatedArgs;
  try { validatedArgs = getUserProfileSchema.parse(args); } catch (error) { logger.error('get_user_profile.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {full} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const profile = await substack_api.getUserProfile();
  if (full) return profile;
  return {id: profile?.id ?? null, name: profile?.name ?? null, handle: profile?.handle ?? null, bio: profile?.bio ?? null, photo_url: profile?.photo_url ?? null, publications: (profile?.publicationUsers ?? []).map((entry) => ({role: entry?.role ?? null, publication_id: entry?.publication?.id ?? null, subdomain: entry?.publication?.subdomain ?? null, name: entry?.publication?.name ?? null})), primary_publication_id: profile?.primaryPublication?.id ?? null, subscription_count: (profile?.subscriptions ?? []).length, _meta: {projected: true, hint: 'Pass full: true for complete payload.'}};
};
