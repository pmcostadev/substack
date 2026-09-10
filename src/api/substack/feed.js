import {summarizeComment} from './comment.js';

export function summarizeFeedItem(item) {
  if (!item) return null;
  if (item.type === 'comment') {
    return {
      type: 'note',
      ...summarizeComment(item.comment),
      publication: item.publication?.name ?? null,
      replying_to: (item.parentComments ?? []).map((parent) => ({id: parent?.id ?? null, author: parent?.name ?? null, body: parent?.body ?? null})),
      can_reply: Boolean(item.canReply),
      surfaced_at: item.context?.timestamp ?? null,
    };
  }
  if (item.type === 'post') {
    const post = item.post ?? {};
    return {
      type: 'post',
      id: post.id ?? null,
      title: post.title ?? null,
      subtitle: post.subtitle ?? null,
      author: (post.publishedBylines ?? []).map((byline) => byline?.name).filter(Boolean).join(', ') || null,
      publication: item.publication?.name ?? null,
      publication_id: post.publication_id ?? null,
      published_at: post.post_date ?? null,
      url: post.canonical_url ?? null,
      audience: post.audience ?? null,
      reactions: post.reaction_count ?? 0,
      comments: post.comment_count ?? 0,
      restacks: post.restacks ?? 0,
      preview_text: post.truncated_body_text ?? null,
      surfaced_at: item.context?.timestamp ?? null,
    };
  }
  return null;
}

export function summarizeFeed(payload, {limit} = {}) {
  const raw = payload?.items ?? [];
  const items = raw.map(summarizeFeedItem).filter(Boolean);
  const trimmed = typeof limit === 'number' ? items.slice(0, limit) : items;
  return {
    returned: trimmed.length,
    ...(raw.length - items.length ? {non_content_items_skipped: raw.length - items.length} : {}),
    next_cursor: payload?.nextCursor ?? null,
    items: trimmed,
  };
}
