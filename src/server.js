import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {createDraftPostSchema, createDraftPostHandler} from "./tools/create_draft_post.js";
import {setPostBodySchema, setPostBodyHandler} from "./tools/set_post_body.js";
import {uploadImageSchema, uploadImageHandler} from "./tools/upload_image.js";
import {listSubscribersSchema, listSubscribersHandler} from "./tools/list_subscribers.js";
import {exportSubscribersSchema, exportSubscribersHandler} from "./tools/export_subscribers.js";
import {listPostsSchema, listPostsHandler} from "./tools/list_posts.js";
import {getDraftSchema, getDraftHandler} from "./tools/get_draft.js";
import {getPublicationStatsSchema, getPublicationStatsHandler} from "./tools/get_publication_stats.js";
import {getAnalyticsSchema, getAnalyticsHandler} from "./tools/get_analytics.js";
import {getPostStatsSchema, getPostStatsHandler} from "./tools/get_post_stats.js";
import {updateDraftSchema, updateDraftHandler} from "./tools/update_draft.js";
import {deleteDraftSchema, deleteDraftHandler} from "./tools/delete_draft.js";
import {publishDraftSchema, publishDraftHandler} from "./tools/publish_draft.js";
import {getPublicationSchema, getPublicationHandler} from "./tools/get_publication.js";
import {getUserProfileSchema, getUserProfileHandler} from "./tools/get_user_profile.js";
import {listPublicationTagsSchema, listPublicationTagsHandler} from "./tools/list_publication_tags.js";
import {getPostTagsSchema, getPostTagsHandler} from "./tools/get_post_tags.js";
import {addTagToPostSchema, addTagToPostHandler} from "./tools/add_tag_to_post.js";
import {getPostCommentsSchema, getPostCommentsHandler} from "./tools/get_post_comments.js";
import {commentOnPostSchema, commentOnPostHandler} from "./tools/comment_on_post.js";
import {listSubscriptionsSchema, listSubscriptionsHandler} from "./tools/list_subscriptions.js";
import {listReaderPostsSchema, listReaderPostsHandler} from "./tools/list_reader_posts.js";
import {getReaderPostSchema, getReaderPostHandler} from "./tools/get_reader_post.js";
import {getReaderFeedSchema, getReaderFeedHandler} from "./tools/get_reader_feed.js";
import {getProfileFeedSchema, getProfileFeedHandler} from "./tools/get_profile_feed.js";
import {getCommentThreadSchema, getCommentThreadHandler} from "./tools/get_comment_thread.js";
import {restackItemSchema, restackItemHandler} from "./tools/restack_item.js";
import {logger} from "./logger.js";

// Hardcoded instead of readFileSync(package.json) because Next.js webpack
// does not resolve import.meta.url to a filesystem path at build time.
const version = "1.0.0";

export const tools = {
  create_draft_post: {description: "create a draft post on your Substack account.", schema: createDraftPostSchema, handler: createDraftPostHandler},
  set_post_body: {description: "replace the body of a draft with a Substack document. This is the only way to write structured content. Create the draft first with create_draft_post, then call this with its id.", schema: setPostBodySchema, handler: setPostBodyHandler},
  upload_image: {description: "Host an image on your Substack publication and get back a Substack URL.", schema: uploadImageSchema, handler: uploadImageHandler},
  list_subscribers: {description: "List and filter the subscribers of your Substack publication.", schema: listSubscribersSchema, handler: listSubscribersHandler},
  export_subscribers: {description: "Export subscribers with their full column values, including engagement metrics.", schema: exportSubscribersSchema, handler: exportSubscribersHandler},
  list_posts: {description: "List the posts of your Substack publication: drafts, published posts or scheduled posts.", schema: listPostsSchema, handler: listPostsHandler},
  get_draft: {description: "Read one draft post in full, including its body and settings.", schema: getDraftSchema, handler: getDraftHandler},
  update_draft: {description: "Change an existing draft's title, subtitle or any of its Post settings.", schema: updateDraftSchema, handler: updateDraftHandler},
  publish_draft: {description: "Publish a draft. send controls whether subscribers get the email.", schema: publishDraftSchema, handler: publishDraftHandler},
  delete_draft: {description: "Delete an unpublished draft.", schema: deleteDraftSchema, handler: deleteDraftHandler},
  get_publication: {description: "Read the settings and identity of your Substack publication.", schema: getPublicationSchema, handler: getPublicationHandler},
  get_user_profile: {description: "Read the account behind the session.", schema: getUserProfileSchema, handler: getUserProfileHandler},
  list_publication_tags: {description: "List every tag defined on your Substack publication.", schema: listPublicationTagsSchema, handler: listPublicationTagsHandler},
  get_post_tags: {description: "List the tags on one post, by name.", schema: getPostTagsSchema, handler: getPostTagsHandler},
  add_tag_to_post: {description: "Add a tag to a post, by tag name.", schema: addTagToPostSchema, handler: addTagToPostHandler},
  get_post_comments: {description: "Read the comments on one of your posts.", schema: getPostCommentsSchema, handler: getPostCommentsHandler},
  comment_on_post: {description: "Post a public comment on one of your posts, as you.", schema: commentOnPostSchema, handler: commentOnPostHandler},
  list_subscriptions: {description: "List the Substack publications this account subscribes to.", schema: listSubscriptionsSchema, handler: listSubscriptionsHandler},
  list_reader_posts: {description: "List recent posts from your subscriptions (reader Inbox).", schema: listReaderPostsSchema, handler: listReaderPostsHandler},
  get_reader_post: {description: "Read one post in full, from any publication.", schema: getReaderPostSchema, handler: getReaderPostHandler},
  get_reader_feed: {description: "Read the Substack Notes feed.", schema: getReaderFeedSchema, handler: getReaderFeedHandler},
  get_profile_feed: {description: "Read what one account has published.", schema: getProfileFeedSchema, handler: getProfileFeedHandler},
  get_comment_thread: {description: "Read one Note or comment together with the replies beneath it.", schema: getCommentThreadSchema, handler: getCommentThreadHandler},
  restack_item: {description: "Restack a Note to your own followers.", schema: restackItemSchema, handler: restackItemHandler},
  get_publication_stats: {description: "Read the headline stats of your Substack publication.", schema: getPublicationStatsSchema, handler: getPublicationStatsHandler},
  get_post_stats: {description: "Rank the posts of your publication by any of 43 per-post metrics.", schema: getPostStatsSchema, handler: getPostStatsHandler},
  get_analytics: {description: "Read one publication-level analytics report.", schema: getAnalyticsSchema, handler: getAnalyticsHandler},
};

export function createServer() {
  const server = new McpServer({name: "Substack MCP", version});
  for (const [name, {description, schema, handler}] of Object.entries(tools)) {
    server.registerTool(name, {description, inputSchema: schema}, async (args) => {
      const startedAt = Date.now();
      logger.info("tool.call.start", {tool: name, args});
      try {
        const result = await handler(args);
        logger.info("tool.call.success", {tool: name, duration_ms: Date.now() - startedAt, result});
        return {content: [{type: "text", text: JSON.stringify(result, null, 2)}]};
      } catch (error) {
        logger.error("tool.call.error", {tool: name, duration_ms: Date.now() - startedAt, error});
        throw error;
      }
    });
  }
  return server;
}
