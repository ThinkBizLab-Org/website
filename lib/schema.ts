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
  status:      text('status').default('draft'),   // draft | review | approved | published
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
  segment:     text('segment').default('general'),
  consentToken: text('consent_token'),
  unsubscribeToken: text('unsubscribe_token'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
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

export const articlePageViews = pgTable('article_page_views', {
  id:        uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id'),
  slug:      text('slug').notNull(),
  path:      text('path').notNull(),
  referrer:  text('referrer'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const socialPostQueue = pgTable('social_post_queue', {
  id:          uuid('id').primaryKey().defaultRandom(),
  articleId:   uuid('article_id'),
  platform:    text('platform').notNull(),
  status:      text('status').notNull().default('queued'), // queued | processing | success | failed | cancelled
  payload:     jsonb('payload'),
  attempts:    integer('attempts').default(0),
  error:       text('error'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const mediaProductionQueue = pgTable('media_production_queue', {
  id:            uuid('id').primaryKey().defaultRandom(),
  articleId:     uuid('article_id'),
  assetType:     text('asset_type').notNull(), // cover_image | instagram_image | short_video
  status:        text('status').notNull().default('queued'), // queued | processing | waiting | success | failed | cancelled
  payload:       jsonb('payload'),
  providerJobId: text('provider_job_id'),
  resultUrl:     text('result_url'),
  resultKey:     text('result_key'),
  attempts:      integer('attempts').default(0),
  error:         text('error'),
  scheduledAt:   timestamp('scheduled_at', { withTimezone: true }),
  processedAt:   timestamp('processed_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const linkCheckResults = pgTable('link_check_results', {
  id:            uuid('id').primaryKey().defaultRandom(),
  articleId:     uuid('article_id'),
  articleTitle:  text('article_title'),
  articleSlug:   text('article_slug'),
  url:           text('url').notNull(),
  normalizedUrl: text('normalized_url').notNull(),
  linkType:      text('link_type').notNull(), // internal | external
  sourceField:   text('source_field').notNull().default('content'),
  status:        text('status').notNull(), // ok | warning | broken | skipped
  statusCode:    integer('status_code'),
  error:         text('error'),
  checkedAt:     timestamp('checked_at', { withTimezone: true }).defaultNow(),
})

export const operationalEvents = pgTable('operational_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  service:   text('service').notNull().default('thinkbiz-app'),
  severity:  text('severity').notNull().default('error'),
  name:      text('name').notNull(),
  message:   text('message').notNull(),
  context:   jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const backupJobs = pgTable('backup_jobs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  status:    text('status').notNull().default('processing'), // processing | success | failed
  trigger:   text('trigger').notNull().default('manual'), // manual | cron
  r2Key:     text('r2_key'),
  url:       text('url'),
  sizeBytes: integer('size_bytes').default(0),
  error:     text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
})

export const contentFactoryTopics = pgTable('content_factory_topics', {
  id:        uuid('id').primaryKey().defaultRandom(),
  topic:     text('topic').notNull(),
  category:  text('category'),
  tags:      text('tags').array(),
  status:    text('status').notNull().default('planned'), // planned | generated | notified | approved | published | failed
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  contentBrief: jsonb('content_brief'),
  articleId: uuid('article_id'),
  approvalToken: text('approval_token').unique(),
  approvalTokenExpiresAt: timestamp('approval_token_expires_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  lineNotifiedAt: timestamp('line_notified_at', { withTimezone: true }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const deadLetterQueue = pgTable('dead_letter_queue', {
  id:         uuid('id').primaryKey().defaultRandom(),
  source:     text('source').notNull(), // social_post_queue | media_production_queue
  sourceId:   uuid('source_id'),
  articleId:  uuid('article_id'),
  reference:  text('reference'), // platform or asset_type of the failed job
  payload:    jsonb('payload'),
  attempts:   integer('attempts').default(0),
  error:      text('error'),
  status:     text('status').notNull().default('pending'), // pending | requeued | discarded
  resolvedBy: text('resolved_by'),
  failedAt:   timestamp('failed_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const aiUsage = pgTable('ai_usage', {
  id:           uuid('id').primaryKey().defaultRandom(),
  kind:         text('kind').notNull(), // brief | article | fact_check
  model:        text('model').notNull(),
  inputTokens:  integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  status:       text('status').notNull().default('success'), // success | failed
  articleId:    uuid('article_id'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const notificationLog = pgTable('notification_log', {
  id:        uuid('id').primaryKey().defaultRandom(),
  event:     text('event').notNull(), // dead_letter | ready_for_approval | published
  channel:   text('channel').notNull(), // line | slack | email
  status:    text('status').notNull(), // sent | failed | skipped
  title:     text('title'),
  message:   text('message'),
  error:     text('error'),
  context:   jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type PublishAttempt = typeof publishAttempts.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect
export type ArticleRevision = typeof articleRevisions.$inferSelect
export type ArticlePageView = typeof articlePageViews.$inferSelect
export type SocialPostQueueItem = typeof socialPostQueue.$inferSelect
export type MediaProductionQueueItem = typeof mediaProductionQueue.$inferSelect
export type DeadLetterQueueItem = typeof deadLetterQueue.$inferSelect
export type NotificationLogItem = typeof notificationLog.$inferSelect
export type AiUsageRow = typeof aiUsage.$inferSelect
export type LinkCheckResult = typeof linkCheckResults.$inferSelect
export type OperationalEvent = typeof operationalEvents.$inferSelect
export type BackupJob = typeof backupJobs.$inferSelect
export type ContentFactoryTopic = typeof contentFactoryTopics.$inferSelect
