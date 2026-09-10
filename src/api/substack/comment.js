export function parseAncestorPath(ancestor_path) {
  if (typeof ancestor_path !== 'string' || ancestor_path === '') return {parent_comment_id: null, depth: 0};
  const segments = ancestor_path.split('.').filter(Boolean);
  const parent = segments.at(-1);
  const parsed = Number(parent);
  return {parent_comment_id: Number.isFinite(parsed) ? parsed : null, depth: segments.length};
}

export function summarizeComment(comment) {
  if (!comment) return null;
  const {parent_comment_id, depth} = parseAncestorPath(comment.ancestor_path);
  return {
    id: comment.id ?? null,
    author: comment.name ?? null,
    author_handle: comment.handle ?? null,
    author_user_id: comment.user_id ?? null,
    body: comment.body ?? null,
    date: comment.date ?? null,
    edited_at: comment.edited_at ?? null,
    reactions: comment.reaction_count ?? Object.keys(comment.reactions ?? {}).length,
    restacks: comment.restacks ?? 0,
    reply_count: comment.children_count ?? (comment.children ?? []).length,
    post_id: comment.post_id ?? null,
    publication_id: comment.publication_id ?? null,
    parent_comment_id,
    depth,
    attachment_count: (comment.attachments ?? []).length,
  };
}
