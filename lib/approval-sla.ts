export type ApprovalSlaTopic = {
  id: string
  topic: string
  status: string
  scheduledAt: Date
  updatedAt: Date | null
  createdAt: Date | null
  lineNotifiedAt: Date | null
  articleId: string | null
}

export type ApprovalSlaBreach = {
  id: string
  topic: string
  status: string
  ageHours: number
  waitingSince: Date
  scheduledAt: Date
  articleId: string | null
}

export function approvalWaitingSince(topic: ApprovalSlaTopic) {
  return topic.lineNotifiedAt ?? topic.updatedAt ?? topic.createdAt ?? topic.scheduledAt
}

export function approvalSlaBreaches(topics: ApprovalSlaTopic[], slaHours: number, now = new Date()): ApprovalSlaBreach[] {
  return topics
    .filter(topic => ['generated', 'notified'].includes(topic.status))
    .map(topic => {
      const waitingSince = approvalWaitingSince(topic)
      const ageHours = Math.max(0, (now.getTime() - waitingSince.getTime()) / (60 * 60 * 1000))
      return {
        id: topic.id,
        topic: topic.topic,
        status: topic.status,
        ageHours,
        waitingSince,
        scheduledAt: topic.scheduledAt,
        articleId: topic.articleId,
      }
    })
    .filter(item => item.ageHours >= slaHours)
    .sort((a, b) => b.ageHours - a.ageHours)
}

export function parseApprovalSlaAlertedKeys(raw: string) {
  try {
    const value = JSON.parse(raw)
    if (Array.isArray(value)) return new Set(value.map(String))
  } catch {
    // Backward compatible fallback for comma-separated settings.
  }
  return new Set(raw.split(',').map(item => item.trim()).filter(Boolean))
}

export function approvalSlaAlertKey(item: Pick<ApprovalSlaBreach, 'id' | 'status'>) {
  return `${item.id}:${item.status}`
}

export function serializeApprovalSlaAlertedKeys(keys: Set<string>) {
  return JSON.stringify(Array.from(keys).slice(-500))
}

export function formatApprovalSlaLineMessage(items: ApprovalSlaBreach[], slaHours: number) {
  const rows = items.slice(0, 8).map((item, index) => {
    const age = Math.round(item.ageHours)
    return `${index + 1}. ${item.topic}\n   ${item.status} · ${age}h waiting`
  })
  return [
    '⏰ Content Factory Approval SLA Alert',
    '',
    `มี ${items.length} งานรอ approve เกิน ${slaHours} ชั่วโมง`,
    '',
    ...rows,
    '',
    'เข้าไปตรวจที่ /admin/content-factory แล้ว approve หรือ reject เพื่อปล่อย flow ต่อ',
  ].join('\n')
}
