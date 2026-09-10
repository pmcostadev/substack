import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {fetchImageAsDataUri, readImageFileAsDataUri, defaultLookup, isPrivateAddress, MAX_IMAGE_BYTES} from "../api/substack/image.js";
import {logger} from "../logger.js";

export {isPrivateAddress, MAX_IMAGE_BYTES};

export const uploadImageSchema = z.strictObject({
  url: z.string().url().optional().describe("The http(s) URL of an image to upload. Provide exactly one of url or path."),
  path: z.string().optional().describe("Absolute path to an image file on the machine running this server. Provide exactly one of url or path."),
  post_id: z.number().optional().describe("Optional id of the post the image belongs to."),
}).superRefine((value, ctx) => {
  if ((value.url === undefined) === (value.path === undefined)) ctx.addIssue({code: 'custom', message: 'Provide exactly one of url or path.'});
});

export const uploadImageHandler = async (args, {lookup = defaultLookup, fetchImpl = fetch} = {}) => {
  logger.debug('upload_image.start', {args});
  let validatedArgs;
  try { validatedArgs = uploadImageSchema.parse(args); } catch (error) { logger.error('upload_image.args.invalid', {issues: error.issues ?? error.message}); throw error; }
  const {url, path: filePath, post_id} = validatedArgs;
  let source;
  if (filePath !== undefined) { logger.info('upload_image.reading', {path: filePath}); source = await readImageFileAsDataUri(filePath); }
  else { logger.info('upload_image.fetching', {url}); source = await fetchImageAsDataUri(url, {lookup, fetchImpl}); }
  const {image, contentType, bytes} = source;
  logger.info('upload_image.uploading', {content_type: contentType, bytes});
  const substack_api = new SubstackApi({publication_url: process.env.SUBSTACK_PUBLICATION_URL, auth_token: process.env.SUBSTACK_SESSION_TOKEN});
  const uploaded = await substack_api.uploadImage({image, post_id: post_id ?? null});
  logger.info('upload_image.done', {url: uploaded.url, bytes: uploaded.bytes});
  return {id: uploaded.id, url: uploaded.url, content_type: uploaded.contentType, bytes: uploaded.bytes, width: uploaded.imageWidth, height: uploaded.imageHeight};
};
