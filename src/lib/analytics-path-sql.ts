/** Cloudflare Analytics Engine supports startsWith, substring (1-based), and if. */
export function canonicalAnalyticsPathSql(column: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(column)) throw new Error('Invalid analytics path column')
  return `if(startsWith(${column}, '/en/explore/'), substring(${column}, 12), if(startsWith(${column}, '/explore/'), substring(${column}, 9), if(startsWith(${column}, '/en/'), substring(${column}, 4), if(${column} = '/en', '/', ${column}))))`
}
