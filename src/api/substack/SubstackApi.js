import {logger} from "../../logger.js";

export default class SubstackApi {
  constructor({email = null, password = null, base_url = null, publication_url = null, auth_token = null}) {
    this.email = email;
    this.password = password;
    this.base_url = base_url || 'https://substack.com/api/v1';
    this.publication_url = new URL('api/v1', publication_url).toString();
    this.hostname = publication_url;
    this.auth_cookie = `substack.sid=${auth_token}; connect.sid=${auth_token};`;
    logger.debug('substack_api.created', {base_url: this.base_url, publication_url: this.publication_url, hostname: this.hostname, has_auth_token: Boolean(auth_token)});
  }

  static async readBody(response) {
    if (!response.ok) {
      const body = await response.text().catch(() => '<unreadable body>');
      logger.error('substack.response.error', {status: response.status, statusText: response.statusText, body});
      const error = new Error(`SubstackAPIException: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return response.text();
  }

  static async handleResponse(response) {
    const text = await SubstackApi.readBody(response);
    let parsed;
    try { parsed = JSON.parse(text); } catch (error) {
      logger.error('substack.response.invalid', {status: response.status, body: text});
      throw new Error(`SubstackRequestException: Invalid Response: ${text}`);
    }
    logger.debug('substack.response.body', {status: response.status, body: parsed});
    return parsed;
  }

  async request({method, path, ...options}) {
    return this.requestUrl({url: `${this.publication_url}${path}`, method, ...options});
  }

  async requestGlobal({method, path, ...options}) {
    return this.requestUrl({url: `${this.base_url}${path}`, method, ...options});
  }

  async requestUrl({method, url: rawUrl, body = null, params = null, referer = '/publish/posts', parse = 'json'}) {
    const target = new URL(rawUrl);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== null && value !== undefined) target.searchParams.set(key, value);
    }
    const url = target.toString();
    const headers = {};
    if (body !== null) headers['Content-Type'] = 'application/json';
    headers['Cookie'] = this.auth_cookie;
    headers['referer'] = `${this.hostname}${referer}`;
    const startedAt = Date.now();
    logger.info('substack.request', {method, url, headers, body});
    let response;
    try {
      response = await fetch(url, {method, headers, ...(body === null ? {} : {body: JSON.stringify(body)})});
    } catch (error) {
      logger.error('substack.request.failed', {method, url, duration_ms: Date.now() - startedAt, error});
      throw error;
    }
    logger.info('substack.response', {method, url, status: response.status, duration_ms: Date.now() - startedAt});
    return parse === 'text' ? SubstackApi.readBody(response) : SubstackApi.handleResponse(response);
  }

  async postDraft(body) { return this.request({method: 'POST', path: '/drafts', body, referer: '/publish/post'}); }
  async uploadImage({image, post_id = null}) { return this.request({method: 'POST', path: '/image', body: post_id === null ? {image} : {image, postId: post_id}, referer: '/publish/post'}); }
  async getSubscribers(query) { return this.request({method: 'POST', path: '/subscriber-stats', body: query, referer: '/publish/subscribers'}); }
  async getPosts({status, limit, offset, order_by, order_direction, query = null}) { return this.request({method: 'GET', path: `/post_management/${status}`, params: {offset, limit, order_by, order_direction, query}, referer: '/publish/posts'}); }
  async getDraft(draft_id) { return this.request({method: 'GET', path: `/drafts/${draft_id}`, referer: '/publish/post'}); }
  async updateDraft(draft_id, body) { return this.request({method: 'PUT', path: `/drafts/${draft_id}`, body, referer: '/publish/post'}); }
  async deleteDraft(draft_id) { return this.request({method: 'DELETE', path: `/drafts/${draft_id}`, referer: '/publish/posts'}); }
  async publishDraft(draft_id, {send = true} = {}) { return this.request({method: 'POST', path: `/drafts/${draft_id}/publish`, body: {send}, referer: '/publish/post'}); }
  async getPublication() { return this.request({method: 'GET', path: '/publication', referer: '/publish/settings'}); }
  async getPostTags() { return this.request({method: 'GET', path: '/publication/post-tag', referer: '/publish/settings'}); }
  async getTagsForPost(post_id) { return this.request({method: 'GET', path: `/post/${post_id}/tag`, referer: '/publish/post'}); }
  async createPostTag(name) { return this.request({method: 'POST', path: '/publication/post-tag', body: {name}, referer: '/publish/settings'}); }
  async addTagToPost(post_id, post_tag_id) { return this.request({method: 'POST', path: `/post/${post_id}/tag/${post_tag_id}`, referer: '/publish/post'}); }
  async listSubscriptions({cursor = null, limit = 100} = {}) { return this.requestGlobal({method: 'GET', path: '/subscriptions/all/v2', params: {limit, cursor}, referer: '/'}); }
  async listReaderPosts({limit = 20, after = null} = {}) { return this.requestGlobal({method: 'GET', path: '/reader/posts', params: {limit, after}, referer: '/inbox'}); }
  async getPostById(post_id) { return this.requestGlobal({method: 'GET', path: `/posts/by-id/${post_id}`, referer: '/inbox'}); }
  async getReaderFeed({tab = 'for-you', cursor = null, limit = 20} = {}) { return this.requestGlobal({method: 'GET', path: '/reader/feed', params: {tab, cursor, limit}, referer: '/notes'}); }
  async getReaderFeedTabs() { return this.requestGlobal({method: 'GET', path: '/reader/feed/tabs', referer: '/notes'}); }
  async getProfileFeed(user_id, {cursor = null, limit = 20} = {}) { return this.requestGlobal({method: 'GET', path: `/reader/feed/profile/${user_id}`, params: {cursor, limit}, referer: '/profile'}); }
  async getComment(comment_id) { return this.requestGlobal({method: 'GET', path: `/reader/comment/${comment_id}`, referer: '/notes'}); }
  async getCommentReplies(comment_id, {cursor = null} = {}) { return this.requestGlobal({method: 'GET', path: `/reader/comment/${comment_id}/replies`, params: {cursor}, referer: '/notes'}); }
  async restackNote(comment_id, {tab_id = 'for-you'} = {}) { return this.requestGlobal({method: 'POST', path: '/restack/feed', body: {commentId: Number(comment_id), tabId: tab_id}, referer: '/notes'}); }
  async getPostComments(post_id, {limit = 50} = {}) { return this.request({method: 'GET', path: `/post/${post_id}/comments`, params: {limit}, referer: '/publish/post'}); }
  async commentOnPost(post_id, body) { return this.request({method: 'POST', path: `/post/${post_id}/comment`, body: {body}, referer: '/publish/post'}); }
  async getUserProfile() { return this.requestGlobal({method: 'GET', path: '/user/profile/self', referer: '/'}); }
  async createSubscriberSet(query, user_ids = null) { return this.request({method: 'POST', path: '/subscriber_set', body: user_ids ? {user_ids} : {query}, referer: '/publish/subscribers'}); }
  async requestSubscriberSetExport({subscriber_set_id, columns}) { return this.request({method: 'POST', path: '/subscriber_set/export', body: {subscriberSetId: subscriber_set_id, columns}, referer: '/publish/subscribers'}); }
  async getSubscriberSetExport(export_id) {
    try { return await this.request({method: 'GET', path: `/subscriber_set/export/${export_id}`, referer: '/publish/subscribers'}); }
    catch (error) { if (error.status === 400 && /Export not ready/i.test(error.body ?? '')) { logger.debug('substack.export.pending', {export_id}); return {pending: true}; } throw error; }
  }
  async downloadExport(url) { return this.requestUrl({method: 'GET', url: new URL(url, this.hostname).toString(), parse: 'text', referer: '/publish/subscribers'}); }
}
