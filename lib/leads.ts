// Lead pipeline statuses for the conversion layer (consult / contact requests).

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export function normalizeLeadStatus(value: unknown): LeadStatus | null {
  return LEAD_STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : null
}
