import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import SubstackPost from "../api/substack/SubstackPost.js";
import {postBodySchema} from "../api/substack/document.js";
import {logger} from "../logger.js";

export const createDraftPostSchema = z.strictObject({
  title: z.string().describe("The title of the post to be created."),
  subtitle: z.string().describe("The subtitle of the post to be created."),
  body: z.string().describe("The body of the post. Plain text becomes one paragraph per line."),
});

const parseBody = (body) => {
  try {
    const doc = JSON.parse(body);
    if (doc && doc.type === 'doc') {
      const validated = postBodySchema.parse(doc);
      logger.debug('draft.body.parsed', {format: 'prosemirror', nodes: validated.content.length});
      return validated;
    }
    logger.debug('draft.body.json_is_not_a_document', {parsed: doc});
  } catch (error) {
    if (error instanceof z.ZodError) { logger.error('draft.body.invalid_document', {issues: error.issues}); throw error; }
  }
  const doc = {type: 'doc', content: body.split(/\n+/).filter(p => p.trim() !== '').map(p => ({type: 'paragraph', content: [{type: 'text', text: p}]}))};
  logger.debug('draft.body.parsed', {format: 'text', nodes: doc.content.length, chars: body.length});
  return doc;
};

export const createDraftPostHandler = async (args) => {
  logger.debug('create_draft_post.start', {args});
  let validatedArgs;
  try { validatedArgs = createDraftPostSchema.parse(args); } catch (error) { logger.error('create_draft_post.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {title, subtitle, body} = validatedArgs;
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const substack_post = new SubstackPost({user_id: process.env.SUBSTACK_USER_ID});
  substack_post.setTitle(title); substack_post.setSubtitle(subtitle); substack_post.setBody(parseBody(body));
  const draft = substack_post.getDraft();
  const response = await substack_api.postDraft(draft);
  logger.info('create_draft_post.created', {draft_id: response?.id ?? null, is_published: response?.is_published ?? null});
  return {draft_id: response?.id ?? null, is_published: response?.is_published ?? false};
};
