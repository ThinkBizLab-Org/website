import { pgTable, uuid, text, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').unique().notNull(),
  slug:        text('slug').unique().notNull(),
  description: text('description'),
  color:       text('color').default('#7C3AED'),
  order:       integer('order').default(0),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Category = typeof categories.$inferSelect

export const articles = pgTable('articles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  title:       text('title').notNull(),
  slug:        text('slug').unique().notNull(),
  excerpt:     text('excerpt'),
  content:     text('content'),  // markdown
  coverImage:  text('cover_image'),
  category:    text('category'),
  tags:        text('tags').array(),
  status:      text('status').default('draft'),   // draft | review | published
  // GEO fields
  aiSummaryQ:  text('ai_summary_q'),   // Question for AI summary box
  aiSummaryA:  text('ai_summary_a'),   // Answer for AI summary box
  keyPoints:   text('key_points').array(),
  faqJson:     jsonb('faq_json'),      // [{q: string, a: string}]
  schemaJson:  jsonb('schema_json'),
  geoScore:    integer('geo_score').default(0),
  readTime:    integer('read_time').default(5),
  featured:    boolean('featured').default(false),
  // LINE Broadcast
  // Scheduling
  publishScheduledAt: timestamp('publish_scheduled_at', { withTimezone: true }),
  // LINE Broadcast
  lineBroadcastMsg:  text('line_broadcast_msg'),
  lineBroadcastSent: boolean('line_broadcast_sent').default(false),
  lineBroadcastAt:   timestamp('line_broadcast_at', { withTimezone: true }),
  // Social publish status
  fbSent:   boolean('fb_sent').default(false),
  fbSentAt: timestamp('fb_sent_at', { withTimezone: true }),
  ttSent:   boolean('tt_sent').default(false),
  ttSentAt: timestamp('tt_sent_at', { withTimezone: true }),
  igSent:   boolean('ig_sent').default(false),
  igSentAt: timestamp('ig_sent_at', { withTimezone: true }),
  // Social Media
  fbCaption:    text('fb_caption'),      // Facebook post (up to ~63k chars, ~500 ideal)
  fbHashtags:   text('fb_hashtags'),     // e.g. "#SME #ธุรกิจ"
  ttCaption:    text('tt_caption'),      // TikTok caption (max 2,200 chars, ~150 ideal)
  ttHashtags:   text('tt_hashtags'),     // TikTok hashtags
  ttVideoUrl:   text('tt_video_url'),    // TikTok video URL (required for auto-post)
  ttVdoPrompt:  text('tt_vdo_prompt'),   // TikTok video generation prompt (for AI video API)
  igCaption:      text('ig_caption'),       // Instagram caption (max 2,200 chars)
  igHashtags:     text('ig_hashtags'),      // Instagram hashtags (up to 30)
  igVideoUrl:     text('ig_video_url'),     // Instagram Reels video URL (Google Drive or CDN)
  igImagePrompt:  text('ig_image_prompt'),  // Prompt for IG-optimized image (1080×1080)
  igImage:        text('ig_image'),         // Generated/uploaded IG image URL
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const settings = pgTable('settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const subscribers = pgTable('subscribers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  email:       text('email').unique(),
  status:      text('status').default('pending'),
  source:      text('source').default('newsletter'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  actorEmail:  text('actor_email'),
  action:      text('action').notNull(),
  entityType:  text('entity_type').notNull(),
  entityId:    text('entity_id'),
  metadata:    jsonb('metadata'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const publishAttempts = pgTable('publish_attempts', {
  id:          uuid('id').primaryKey().defaultRandom(),
  articleId:   uuid('article_id'),
  platform:    text('platform').notNull(),
  status:      text('status').notNull(), // success | failed | skipped
  mode:        text('mode').default('manual'), // manual | cron | test | reset
  error:       text('error'),
  metadata:    jsonb('metadata'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const adminUsers = pgTable('admin_users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  email:     text('email').unique().notNull(),
  name:      text('name'),
  role:      text('role').notNull().default('editor'), // owner | admin | editor | viewer
  active:    boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const articleRevisions = pgTable('article_revisions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  articleId:  uuid('article_id').notNull(),
  version:    integer('version').notNull(),
  action:     text('action').notNull(), // create | update | patch | restore | delete
  actorEmail: text('actor_email'),
  snapshot:   jsonb('snapshot').notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type PublishAttempt = typeof publishAttempts.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect
export type ArticleRevision = typeof articleRevisions.$inferSelect
