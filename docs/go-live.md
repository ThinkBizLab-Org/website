# Go-Live Checklist — ThinkBiz Lab automation platform

ทำตามทีละขั้น (บนลงล่าง). กล่อง `[ ]` กดเช็กได้. คำสั่งรันจาก repo root.

> สรุป: ระบบเป็น automation platform ที่เดินครบลูป (เขียน → ตรวจคุณภาพ → เผยแพร่ →
> กระจายโซเชียล → อีเมล → lead/analytics) ขับด้วย cron. "ใส่ env" จำเป็นแต่ไม่พอ —
> ต้อง **รัน migration + ต่อ OAuth โซเชียล + เปิดสวิตช์ใน Admin** ด้วย.

---

## 1) บัญชี/คีย์ที่ต้องเตรียม
- [ ] Neon Postgres (DATABASE_URL)
- [ ] Google OAuth client (ล็อกอินแอดมิน)
- [ ] Cloudflare R2 bucket + API token (เก็บไฟล์/รูป/วิดีโอ)
- [ ] Anthropic API key (เขียนบทความ)
- [ ] fal.ai key (รูปปก/ภาพ B-roll)
- [ ] Resend key + โดเมนผู้ส่งที่ verify แล้ว (อีเมลทั้งหมด)
- [ ] โซเชียล: LINE OA, Facebook Page, Instagram Business, TikTok developer app
- [ ] (ออปชัน) HeyGen key / ElevenLabs key / AWS สำหรับวิดีโอ

## 2) Environment variables
อ้างอิงไฟล์ตัวอย่าง: `.env.local.example`. ตั้งบน Vercel (Production).

**แกนระบบ (จำเป็น — เช็กได้ที่ `/api/health`)**
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] `ADMIN_EMAILS` (อีเมล Gmail ที่เข้า /admin ได้)
- [ ] `ENCRYPTION_KEY` (เข้ารหัส API key ที่เก็บใน DB — `openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`

**ความสามารถ (ใส่เท่าที่ใช้ — หลายตัวตั้งใน Admin → Settings ได้เช่นกัน)**
- [ ] `ANTHROPIC_API_KEY` — เขียนบทความ
- [ ] `FAL_KEY` — รูป
- [ ] `RESEND_API_KEY` + `NOTIFY_EMAIL_FROM` — อีเมล/newsletter/tracking
- [ ] `CRON_SECRET` — ป้องกัน cron endpoints (ตั้งให้ตรงกับ Vercel Cron)
- [ ] `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LINE_ADMIN_USER_IDS`
- [ ] `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`, `IG_USER_ID`
- [ ] `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`
- [ ] (ออปชัน) `HEYGEN_*`, `ERROR_WEBHOOK_URL`
- [ ] (สาธารณะ) `NEXT_PUBLIC_LINE_OA_URL`, `NEXT_PUBLIC_LEAD_MAGNET_URL/TITLE/DESC`

> ElevenLabs (เสียงพากย์วิดีโอ) ตั้งผ่าน **Admin → Settings** (เก็บเข้ารหัส) ไม่ใช่ env.

## 3) Database migrations
ไฟล์อยู่ใน `scripts/sql/` (รันเรียงตามเลข; idempotent — รันซ้ำได้)
- [ ] Dry-run ดูว่ามีอะไรค้าง: `npm run migrations:run`
- [ ] Apply จริง: `npm run migrations:run -- --write`
- [ ] ยืนยันว่าครอบคลุมถึง `027_subscriber_engagement.sql`

## 4) ต่อ OAuth/Webhook โซเชียล (ไม่ใช่แค่ env)
- [ ] **LINE**: ตั้ง Webhook URL = `https://<domain>/api/line/webhook` ใน LINE OA → ทดสอบที่ Settings → "ทดสอบ Webhook"
- [ ] **LINE admin register**: ส่งคีย์เวิร์ดลงทะเบียนให้บอท เพื่อเก็บ LINE User ID แอดมิน
- [ ] **Facebook/Instagram**: ใส่ Page Access Token (long-lived) + Page ID → กด Auto-fetch IG ID ใน Settings
- [ ] **TikTok**: เชื่อมผ่านหน้า `/admin/tiktok` (OAuth) ให้ได้ access/refresh token
- [ ] ยืนยันโดเมน R2/CDN ใน TikTok Developer Portal (จำเป็นสำหรับ `PULL_FROM_URL`)

## 5) อีเมล (Resend)
- [ ] verify โดเมนผู้ส่งใน Resend (SPF/DKIM) — ไม่งั้นอีเมลตกสแปม/ไม่ส่ง
- [ ] ทดสอบ: สมัครรับข่าวที่หน้าเว็บ → ต้องได้อีเมลยืนยัน → กดยืนยัน → ต้องได้อีเมลต้อนรับ

## 6) เปิดสวิตช์ใน Admin → Settings
- [ ] `cron_enabled` = on
- [ ] Content Factory: เปิด + ตั้ง daily count / publish hour / days ahead
- [ ] Quality gate = on, Approval SLA = on
- [ ] Newsletter: เปิด (Subscribers → Newsletter panel)
- [ ] Analytics pixels (GA4 / FB / TikTok) ถ้ามี
- [ ] **Auto-approve: แนะนำปิดไว้ช่วงแรก** (ดูข้อ 9)

## 7) วิดีโอ (ออปชัน)
- [ ] **HeyGen** (avatar): ใส่ key + avatar/voice id ใน Settings → ใช้ได้เลย
- [ ] **Remotion** (motion/B-roll): ดู `remotion/README.md` + `remotion/aws-policy.md`
  - [ ] `cd remotion && node deploy.mjs` (ได้ `REMOTION_*`)
  - [ ] ใส่ `REMOTION_*` + `AWS_*` env
  - [ ] `npm install @remotion/lambda` (commit lockfile) ให้แอป
  - [ ] ตั้ง ElevenLabs key+voice (ถ้าต้องการเสียงพากย์) + เลือก ttsProvider
  - [ ] เช็ก readiness ที่ `GET /api/video-pipeline` ให้ `ready: true` แล้วค่อยเปิด flag
  - [ ] (แนะนำ) เปิด "ต้องอนุมัติก่อนโพสต์วิดีโอ" → รีวิวที่ `/admin/videos`

## 8) ตรวจสอบหลังตั้งค่า
- [ ] `GET /api/health` → `ok: true` (DB + env ครบ)
- [ ] `GET /api/video-pipeline` → ดู readiness (ถ้าใช้วิดีโอ)
- [ ] ทดสอบ AI key / fal key / LINE webhook ปุ่มใน Settings
- [ ] สร้างบทความทดสอบ → publish → เช็กว่าขึ้นโซเชียลตาม queue (`/admin/social-queue`)
- [ ] เช็ก `/admin/monitoring` + `/admin/dead-letter-queue` ว่าไม่มี error ค้าง

## 9) แผนเปิดใช้ที่แนะนำ (เน้นคุณภาพ)
1. สัปดาห์ 1–2: **human-in-the-loop** — Content Factory สร้าง draft, อนุมัติเองผ่าน LINE/แอดมิน, ดูคุณภาพจริง
2. ปรับเกณฑ์ auto-approve (quality score / fact-check) ให้เข้มพอดี
3. ค่อยเปิด **auto-approve** เมื่อมั่นใจ → ระบบเดินอัตโนมัติเต็ม
4. เปิดวิดีโอ Remotion เป็นลำดับท้าย หลัง text/social/email นิ่งแล้ว

## 10) ตาราง Cron (กำหนดไว้ใน `vercel.json`)
| งาน | path | ตาราง |
|---|---|---|
| Publish ตามเวลา | `/api/cron/publish` | ทุกวัน 01:00 |
| Social queue | `/api/cron/social-queue` | ทุก 15 นาที |
| Media production | `/api/cron/media-production` | ทุก 15 นาที |
| Content Factory | `/api/cron/content-factory` | ทุกวัน 00:00 |
| Backup | `/api/cron/backup` | ทุกวัน 01:30 |
| Ops digest | `/api/cron/ops-digest` | จันทร์ 02:00 |
| Evergreen reshare | `/api/cron/evergreen` | ทุกวัน 04:00 |
| Stale content | `/api/cron/stale-content` | อังคาร 03:00 |
| Newsletter | `/api/cron/newsletter` | พฤหัส 02:00 |
| Newsletter drip | `/api/cron/newsletter-drip` | ทุกวัน 05:00 |
| Platform metrics | `/api/cron/platform-metrics` | ทุก 6 ชม. |
| Re-engagement | `/api/cron/reengagement` | พุธ 06:00 |

---
อัปเดตเอกสารนี้เมื่อเพิ่ม env/cron/ขั้นตอนใหม่.
