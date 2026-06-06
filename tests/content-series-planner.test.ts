import { describe, expect, it } from 'vitest'
import { contentSeriesToTopicSeeds, parseContentSeriesPlans } from '@/lib/content-series-planner'

describe('content series planner', () => {
  it('parses series lines by priority', () => {
    const plans = parseContentSeriesPlans([
      'SME Cashflow Masterclass | Finance | SME, Cashflow | วาง cash conversion cycle; ลด dead stock; เร่งเก็บเงินลูกค้า | คุมเงินสด | 4',
      '!AI Automation Sprint | AI & Tech | AI, Automation | งานขาย; งานบัญชี',
      '# ignored comment',
    ].join('\n'))

    expect(plans).toHaveLength(2)
    expect(plans[0]).toMatchObject({
      title: 'AI Automation Sprint',
      category: 'AI & Tech',
      priority: 5,
    })
    expect(plans[1].episodes).toEqual(['วาง cash conversion cycle', 'ลด dead stock', 'เร่งเก็บเงินลูกค้า'])
  })

  it('turns every episode into a topic seed', () => {
    const seeds = contentSeriesToTopicSeeds('SME Cashflow Masterclass | Finance | SME, Cashflow | วาง cash conversion cycle; ลด dead stock | คุมเงินสด | 4')

    expect(seeds).toEqual([
      {
        topic: 'SME Cashflow Masterclass EP.1: วาง cash conversion cycle',
        category: 'Finance',
        tags: ['SME', 'Cashflow', 'Series', 'SME Cashflow Masterclass'],
      },
      {
        topic: 'SME Cashflow Masterclass EP.2: ลด dead stock',
        category: 'Finance',
        tags: ['SME', 'Cashflow', 'Series', 'SME Cashflow Masterclass'],
      },
    ])
  })

  it('ignores lines without episodes', () => {
    expect(parseContentSeriesPlans('Incomplete Series | Strategy | SME')).toEqual([])
  })
})
