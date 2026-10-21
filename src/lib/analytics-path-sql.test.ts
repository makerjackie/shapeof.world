// @vitest-environment node
import { expect, it } from 'vitest'
import { canonicalAnalyticsPathSql } from './analytics-path-sql'

it('normalizes old world paths before analytics session and percentile aggregation', () => {
  const sql = canonicalAnalyticsPathSql('blob7')
  expect(sql).toContain("startsWith(blob7, '/en/explore/')")
  expect(sql).toContain('substring(blob7, 12)')
  expect(sql).toContain('substring(blob7, 9)')
  expect(() => canonicalAnalyticsPathSql('blob7); DROP TABLE x')).toThrow()
})
