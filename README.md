# Substack MCP

MCP server for Substack with Streamable HTTP transport, deployed on Vercel.

27 tools: drafts, publish, subscribers, analytics, tags, comments, Notes, reader feed, and more.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpmcostadev%2Fsubstack&env=SUBSTACK_PUBLICATION_URL,SUBSTACK_SESSION_TOKEN,SUBSTACK_USER_ID&envDescription=Your%20Substack%20credentials)

Or import at [vercel.com/new](https://vercel.com/new) and set these env vars:

| Variable | Description |
|----------|-------------|
| `SUBSTACK_PUBLICATION_URL` | e.g. `https://yourname.substack.com` |
| `SUBSTACK_SESSION_TOKEN` | Your `substack.sid` cookie from browser devtools |
| `SUBSTACK_USER_ID` | Your numeric Substack user ID |

## MCP endpoint

```
POST https://your-domain.vercel.app/mcp
```

Streamable HTTP transport, no client auth required (credentials live server-side in env vars).

## Tools

| Tool | Description |
|------|-------------|
| `create_draft_post` | Create a draft from title, subtitle and plain-text body |
| `set_post_body` | Replace a draft's body with structured content |
| `update_draft` | Change title, subtitle and 9 Post settings |
| `get_draft` | Read one draft in full |
| `list_posts` | List drafts, published or scheduled posts |
| `publish_draft` | Publish a draft, with email control |
| `delete_draft` | Delete an unpublished draft |
| `upload_image` | Re-host an image on Substack's CDN |
| `list_subscribers` | List and filter subscribers (48 columns, 18 operators) |
| `export_subscribers` | Export subscribers with engagement metrics |
| `get_publication` | Read publication settings |
| `get_user_profile` | Read your account and publications |
| `get_publication_stats` | Headline stats |
| `get_post_stats` | Rank posts by 43 per-post metrics |
| `get_analytics` | 16 publication-level reports |
| `list_publication_tags` | List tags |
| `get_post_tags` | Tags on one post |
| `add_tag_to_post` | Tag a post |
| `get_post_comments` | Read comments |
| `comment_on_post` | Post a comment |
| `list_subscriptions` | What you subscribe to |
| `list_reader_posts` | Your inbox |
| `get_reader_post` | Read any post in full |
| `get_reader_feed` | Notes feed |
| `get_profile_feed` | One account's published Notes and posts |
| `get_comment_thread` | A Note and its replies |
| `restack_item` | Restack a Note |

## Credits

All 27 tools and the Substack API layer are from [marcomoauro/substack-mcp](https://github.com/marcomoauro/substack-mcp) (MIT). This repo rewires the transport from stdio to Streamable HTTP for Vercel deployment.

## License

MIT
