import { describe, expect, it } from 'vitest'
import { isSupportedVideoUrl, parseVideoEmbed } from '@creator-links/shared'

describe('parseVideoEmbed', () => {
  it('YouTube: watch?v= 形式', () => {
    const r = parseVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(r?.provider).toBe('youtube')
    expect(r?.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('YouTube: youtu.be 短縮形式', () => {
    const r = parseVideoEmbed('https://youtu.be/dQw4w9WgXcQ')
    expect(r?.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('YouTube: /shorts/', () => {
    const r = parseVideoEmbed('https://www.youtube.com/shorts/abcdef12345')
    expect(r?.embedUrl).toBe('https://www.youtube.com/embed/abcdef12345')
  })

  it('YouTube: m.youtube.com もサポート', () => {
    const r = parseVideoEmbed('https://m.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(r?.provider).toBe('youtube')
  })

  it('Vimeo: vimeo.com/<id>', () => {
    const r = parseVideoEmbed('https://vimeo.com/123456789')
    expect(r?.provider).toBe('vimeo')
    expect(r?.embedUrl).toBe('https://player.vimeo.com/video/123456789')
  })

  it('Vimeo: player.vimeo.com/video/<id>', () => {
    const r = parseVideoEmbed('https://player.vimeo.com/video/123456789')
    expect(r?.embedUrl).toBe('https://player.vimeo.com/video/123456789')
  })

  it('サポート外は null', () => {
    expect(parseVideoEmbed('https://example.com/video.mp4')).toBeNull()
    expect(parseVideoEmbed('https://www.tiktok.com/@user/video/1234')).toBeNull()
    expect(parseVideoEmbed('https://www.youtube.com/')).toBeNull() // v なし
    expect(parseVideoEmbed('https://vimeo.com/')).toBeNull() // id なし
  })

  it('非 URL / 非 http は null', () => {
    expect(parseVideoEmbed('not a url')).toBeNull()
    expect(parseVideoEmbed('javascript:alert(1)')).toBeNull()
    expect(parseVideoEmbed('')).toBeNull()
  })

  it('isSupportedVideoUrl は parse 成否を返す', () => {
    expect(isSupportedVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    expect(isSupportedVideoUrl('https://example.com/video.mp4')).toBe(false)
  })
})
