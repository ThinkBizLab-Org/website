export type TopicSeed = {
  topic: string
  category: string
  tags: string[]
}

export type TopicDeduplicationCandidate = {
  title: string
  category?: string | null
}

const STOP_WORDS = new Set([
  'และ', 'หรือ', 'คือ', 'เป็น', 'ใน', 'ที่', 'จาก', 'ของ', 'ให้', 'ได้', 'ไม่', 'กับ', 'แล้ว', 'การ', 'ควร', 'ทำไม', 'อย่างไร',
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'what', 'when', 'why', 'how',
])

export function normalizeTopic(value: string) {
  return value
    .toLowerCase()
    .replace(/[?？!！:：,，.。()[\]{}"'“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function topicTokens(value: string) {
  return normalizeTopic(value)
    .split(/[^A-Za-z0-9\u0E00-\u0E7F]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token))
}

export function topicSimilarity(a: string, b: string) {
  const normalizedA = normalizeTopic(a)
  const normalizedB = normalizeTopic(b)
  if (!normalizedA || !normalizedB) return 0
  if (normalizedA === normalizedB) return 1
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.92

  const aTokens = new Set(topicTokens(normalizedA))
  const bTokens = new Set(topicTokens(normalizedB))
  if (aTokens.size === 0 || bTokens.size === 0) return 0

  let intersection = 0
  for (const token of Array.from(aTokens)) if (bTokens.has(token)) intersection += 1
  const union = new Set([...Array.from(aTokens), ...Array.from(bTokens)]).size
  return intersection / union
}

export function isDuplicateTopic(topic: string, candidates: TopicDeduplicationCandidate[], threshold = 0.62) {
  const normalized = normalizeTopic(topic)
  return candidates.some(candidate => {
    const score = topicSimilarity(normalized, candidate.title)
    if (score >= threshold) return true
    if (candidate.category && score >= 0.48 && normalizeTopic(candidate.category) && normalized.includes(normalizeTopic(candidate.category))) return true
    return false
  })
}

export function pickUniqueTopicSeed(
  seeds: TopicSeed[],
  startIndex: number,
  existing: TopicDeduplicationCandidate[],
  used: TopicDeduplicationCandidate[] = [],
) {
  if (seeds.length === 0) return null
  const candidates = [...existing, ...used]
  for (let attempt = 0; attempt < seeds.length; attempt++) {
    const seed = seeds[(startIndex + attempt) % seeds.length]
    if (!isDuplicateTopic(seed.topic, candidates)) return seed
  }
  return null
}
