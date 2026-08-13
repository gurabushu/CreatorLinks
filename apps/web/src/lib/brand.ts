// ブランド識別の 1 箇所集約。UI・メール・metadata から必ずここを import すること。
// リブランド (CreatorLinks → EncoreCue) を SITE_NAME の値変更だけで完結できるようにしている。
// package.json / リポジトリ名 / DB 名 / ドメインなどインフラ側の識別子は別対応。

export const SITE_NAME = 'EncoreCue'
// TODO: 音楽業界ピボット後のタグラインとして再検討中。差し替え候補あれば別 PR で更新する。
export const SITE_TAGLINE = '音楽の仕事を、次のアンコールへ'
