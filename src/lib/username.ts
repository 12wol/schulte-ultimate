/** 登录用用户名：仅字母数字下划线，3～20 位，内部映射为假邮箱，无需真实邮箱验证 */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw)
  if (!u) return '请填写用户名'
  if (!USERNAME_RE.test(u)) return '用户名需 3～20 位，仅英文字母、数字、下划线'
  return null
}

/** Supabase Auth 仍要 email 字段；用固定假域名，不发邮件 */
export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@island.local`
}
