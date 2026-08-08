/**
 * アーティストとして公開表示する名前を返す。
 * displayName が空文字/null の場合は name をフォールバック表示する。
 * 他人視点で見えるすべての箇所（アーティスト一覧、公開プロフィール、
 * チャット相手表示、コメント投稿者名 等）はこのヘルパーを経由すること。
 */
export function getDisplayName<T extends { name: string; displayName?: string | null }>(user: T): string {
  const dn = user.displayName?.trim()
  if (dn) return dn
  return user.name
}
