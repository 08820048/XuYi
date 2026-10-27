import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 部署脚本会把 db/schema.sql 原样执行到线上 D1。语法错误只有在部署时才暴露（本地迁移是单独的文件），
// 所以这里做一层静态检查：每个顶格（无缩进）的非注释行必须以合法的语句起始/收尾开头，
// 能抓住「CREATE TABLE 行被截断，只剩列定义」这类拼接错误。
const TOP_LEVEL_OK = /^(CREATE\s|DROP\s|INSERT\s|ALTER\s|PRAGMA\s|UPDATE\s|DELETE\s|VALUES|SELECT\s|FROM\s|WHERE\s|\)|END;|BEGIN|--)/i

function topLevelLines(sql: string) {
  return sql
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.trim() !== '' && !/^\s/.test(line))
}

describe('db/schema.sql', () => {
  const sql = readFileSync('db/schema.sql', 'utf8')

  it('has only valid statement starters at top level', () => {
    const bad = topLevelLines(sql).filter(({ line }) => !TOP_LEVEL_OK.test(line))
    expect(bad.map(({ number, line }) => `${number}: ${line.slice(0, 60)}`)).toEqual([])
  })

  it('has balanced parentheses in every CREATE TABLE', () => {
    const tables = sql.match(/CREATE TABLE[\s\S]*?\n\);/gi) ?? []
    expect(tables.length).toBeGreaterThan(5)
    for (const table of tables) {
      const open = (table.match(/\(/g) ?? []).length
      const close = (table.match(/\)/g) ?? []).length
      expect(open, table.split('\n')[0]).toBe(close)
    }
  })

  it('defines the translation tables with their AI state columns', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS post_translations\s*\(/)
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS post_translation_chunks\s*\(/)
    for (const column of ['source_hash TEXT', 'ai_state TEXT', 'ai_error TEXT']) {
      expect(sql).toContain(column)
    }
  })
})
