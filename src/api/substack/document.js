import {z} from "zod";

const looseAttrs = z.looseObject({}).describe('Editor-written attributes; pass them back unchanged.');

const markSchema = z.discriminatedUnion('type', [
  z.strictObject({type: z.literal('strong')}).describe('Bold.'),
  z.strictObject({type: z.literal('em')}).describe('Italic.'),
  z.strictObject({type: z.literal('code')}).describe('Inline code.'),
  z.strictObject({type: z.literal('strikethrough')}).describe('Struck through.'),
  z.strictObject({type: z.literal('link'), attrs: z.looseObject({href: z.string().describe('Absolute URL.')})}).describe('A link.'),
]).describe('An inline mark applied to a text node.');

const textNode = z.strictObject({type: z.literal('text'), text: z.string(), marks: z.array(markSchema).optional()}).describe('A run of text.');
const hardBreakNode = z.strictObject({type: z.literal('hard_break')}).describe('A line break inside a paragraph.');
const inlineContent = z.array(z.discriminatedUnion('type', [textNode, hardBreakNode]));

const paragraphNode = z.strictObject({type: z.literal('paragraph'), attrs: looseAttrs.optional(), content: inlineContent.optional()}).describe('A paragraph of text.');

const headingAttrs = looseAttrs.extend({level: z.number().int().min(1).max(6).describe('Heading level, 1 to 6.')});
const headingNode = z.strictObject({type: z.literal('heading'), attrs: headingAttrs, content: inlineContent.optional()}).describe('A section heading.');

const listItemNode = z.strictObject({type: z.literal('list_item'), get content() { return z.array(z.discriminatedUnion('type', [paragraphNode, bulletListNode, orderedListNode])); }}).describe('One item of a list.');
const bulletListNode = z.strictObject({type: z.literal('bullet_list'), attrs: looseAttrs.optional(), get content() { return z.array(listItemNode); }}).describe('A bulleted list.');
const orderedListNode = z.strictObject({type: z.literal('ordered_list'), attrs: looseAttrs.extend({order: z.number().int().optional(), start: z.number().int().optional()}).optional(), get content() { return z.array(listItemNode); }}).describe('A numbered list.');

const blockquoteNode = z.strictObject({type: z.literal('blockquote'), get content() { return z.array(z.discriminatedUnion('type', [paragraphNode, bulletListNode, orderedListNode])); }}).describe('A quotation.');
const codeBlockNode = z.strictObject({type: z.literal('highlighted_code_block'), attrs: looseAttrs.extend({language: z.string().optional()}).optional(), content: inlineContent}).describe('A syntax-highlighted code block.');
const legacyCodeBlockNode = z.strictObject({type: z.literal('code_block'), attrs: looseAttrs.optional(), content: inlineContent}).describe('The older code block.');
const horizontalRuleNode = z.strictObject({type: z.literal('horizontal_rule')}).describe('A horizontal divider.');
const paywallNode = z.strictObject({type: z.literal('paywall')}).describe('Everything after this node is for paying subscribers only. At most one per document.');

const captionedImageNode = z.strictObject({type: z.literal('captionedImage'), content: z.array(z.discriminatedUnion('type', [
  z.strictObject({type: z.literal('image2'), attrs: looseAttrs.extend({src: z.string().describe('Image URL. Must already be hosted by Substack.'), alt: z.string().nullable().optional()})}).describe('The image itself.'),
  z.strictObject({type: z.literal('caption'), content: inlineContent.optional()}).describe('The caption under an image.'),
]))}).describe('An image with optional caption.');

const buttonNode = z.strictObject({type: z.literal('button'), attrs: looseAttrs.extend({url: z.string(), text: z.string()})}).describe('A call-to-action button.');
const youtubeNode = z.strictObject({type: z.literal('youtube2'), attrs: looseAttrs.extend({videoId: z.string()})}).describe('An embedded YouTube video.');

const opaqueNode = (type, description) => z.looseObject({type: z.literal(type)}).describe(description);
const digestPostEmbedNode = opaqueNode('digestPostEmbed', 'An embedded post card.');
const substackMentionsNode = opaqueNode('substack_mentions', 'A mention of another publication or user.');
const directMessageNode = opaqueNode('directMessage', 'A direct-message block.');

export const postBodySchema = z.strictObject({type: z.literal('doc'), content: z.array(z.discriminatedUnion('type', [
  paragraphNode, headingNode, bulletListNode, orderedListNode, blockquoteNode,
  codeBlockNode, legacyCodeBlockNode, horizontalRuleNode, paywallNode,
  captionedImageNode, buttonNode, youtubeNode,
  digestPostEmbedNode, substackMentionsNode, directMessageNode,
]))})
  .describe('The post body as a Substack ProseMirror document.')
  .refine((document) => document.content.filter((node) => node.type === 'paywall').length <= 1, {message: 'A document may contain at most one paywall node.', path: ['content']});

export const summarizeNodes = (document) => {
  const counts = {};
  const walk = (node) => { if (!node || typeof node !== 'object') return; if (typeof node.type === 'string' && node.type !== 'text' && node.type !== 'doc') counts[node.type] = (counts[node.type] ?? 0) + 1; if (Array.isArray(node.content)) node.content.forEach(walk); };
  walk(document);
  return counts;
};
