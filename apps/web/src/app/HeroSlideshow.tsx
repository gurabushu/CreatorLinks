'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SLIDES = [
  {
    headline: '才能を、つなぐ。',
    accent: '手数料10%で始める営業革命。',
    body: 'ランサーズ16.5%・ココナラ22%より断然お得。\nアーティスト特化型のマッチングプラットフォーム。',
  },
  {
    headline: 'サブスク契約で',
    accent: '継続案件が可能に。',
    body: '月額型のサブスク契約で安定した収入源を確保。\nクライアントと長期パートナーシップを築こう。',
  },
  {
    headline: 'ポートフォリオを登録して',
    accent: 'PRO認定を目指そう。',
    body: 'PRO メンバーは検索上位表示・優先案件紹介を獲得。\n実績を積んでキャリアアップを加速しよう。',
  },
]

export function HeroSlideshow() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent((i) => (i + 1) % SLIDES.length)
        setVisible(true)
      }, 350)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const slide = SLIDES[current]

  return (
    <section className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div
          className="transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {slide.headline}
            <br />
            <span className="text-purple-200">{slide.accent}</span>
          </h1>
          <p className="text-xl text-purple-100 mb-8 whitespace-pre-line">
            {slide.body}
          </p>
        </div>

        <div className="flex gap-4 justify-center flex-wrap mb-8">
          <Link
            href="/auth"
            className="bg-white text-purple-700 font-bold px-8 py-3 rounded-full hover:bg-purple-50 transition"
          >
            無料で始める
          </Link>
          <Link
            href="/projects"
            className="border border-white text-white font-bold px-8 py-3 rounded-full hover:bg-white/10 transition"
          >
            案件を探す
          </Link>
        </div>

        {/* ドットインジケーター */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setVisible(true) }, 350) }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current ? 'bg-white w-5' : 'bg-white/40'
              }`}
              aria-label={`スライド ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
