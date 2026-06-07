import { z } from 'zod'

const nullableString = z.string().trim().nullable().optional()
const optionalString = z.string().trim().optional()
const urlString = z.string().trim().url().or(z.literal('')).optional()

export const articleStatusSchema = z.enum(['draft', 'review', 'approved', 'published'])

export const articleInputSchema = z.object({
  title: z.string().trim().min(1).max(240),
  slug: z.string().trim().min(1).max(240).optional(),
  excerpt: z.string().trim().max(1000).nullable().optional(),
  content: z.string().max(200000).nullable().optional(),
  coverImage: urlString.nullable(),
  category: nullableString,
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  status: articleStatusSchema.default('draft'),
  aiSummaryQ: nullableString,
  aiSummaryA: nullableString,
  keyPoints: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  faqJson: z.unknown().optional(),
  schemaJson: z.unknown().optional(),
  readTime: z.coerce.number().int().min(1).max(120).optional(),
  featured: z.coerce.boolean().optional(),
  publishScheduledAt: z.string().datetime().or(z.literal('')).nullable().optional(),
  lineBroadcastMsg: nullableString,
  fbCaption: nullableString,
  fbHashtags: nullableString,
  ttCaption: nullableString,
  ttHashtags: nullableString,
  ttVideoUrl: urlString.nullable(),
  ttVdoPrompt: nullableString,
  igCaption: nullableString,
  igHashtags: nullableString,
  igVideoUrl: urlString.nullable(),
  igImagePrompt: nullableString,
  igImage: urlString.nullable(),
})

export const articlePatchSchema = z.object({
  coverImage: urlString.nullable(),
  igImage: urlString.nullable(),
  igImagePrompt: nullableString,
  igVideoUrl: urlString.nullable(),
}).partial()

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: optionalString,
  description: nullableString,
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#7C3AED'),
  order: z.coerce.number().int().min(-10000).max(10000).default(0),
})

export const settingInputSchema = z.object({
  cron_enabled: z.boolean().optional(),
  content_factory_enabled: z.boolean().optional(),
  content_factory_daily_count: z.coerce.number().int().min(1).max(10).optional(),
  content_factory_days_ahead: z.coerce.number().int().min(1).max(60).optional(),
  content_factory_publish_hour: z.coerce.number().int().min(0).max(23).optional(),
  content_factory_approval_sla_enabled: z.boolean().optional(),
  content_factory_approval_sla_hours: z.coerce.number().int().min(1).max(168).optional(),
  content_factory_analytics_feedback_enabled: z.boolean().optional(),
  content_factory_quality_gate_enabled: z.boolean().optional(),
  content_factory_trend_refine_enabled: z.boolean().optional(),
  content_factory_topic_bank: optionalString,
  content_factory_series_plans: z.string().trim().max(20000).optional(),
  content_factory_trend_news_inputs: z.string().trim().max(20000).optional(),
  content_factory_trend_feeds: z.string().trim().max(20000).optional(),
  timezone: optionalString,
  anthropic_api_key: optionalString,
  fal_api_key: optionalString,
  line_admin_user_ids: optionalString,
  line_register_keyword: optionalString,
  line_channel_access_token: optionalString,
  line_channel_secret: optionalString,
  heygen_api_key: optionalString,
  heygen_avatar_id: optionalString,
  heygen_avatar_look_id: optionalString,
  heygen_voice_id: optionalString,
  elevenlabs_api_key: optionalString,
  elevenlabs_voice_id: optionalString,
  resend_api_key: optionalString,
  notify_email_from: optionalString,
  fb_page_access_token: optionalString,
  fb_page_id: optionalString,
  ig_user_id: optionalString,
  ga_measurement_id: optionalString,
  fb_pixel_id: optionalString,
  tiktok_pixel_id: optionalString,
}).strict()

export function validationError(error: z.ZodError) {
  return {
    error: 'Invalid request body',
    issues: error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
}
