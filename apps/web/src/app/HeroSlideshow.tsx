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
    <section className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white py-14 sm:py-20 md:py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div
          className="transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            {slide.headline}
            <br />
            <span className="text-purple-200">{slide.accent}</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-purple-100 mb-6 sm:mb-8 whitespace-pre-line">
            {slide.body}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-6 sm:mb-8 max-w-sm sm:max-w-none mx-auto">
          <Link
            href="/auth"
            className="bg-white text-purple-700 font-bold px-6 sm:px-8 py-3 rounded-full hover:bg-purple-50 transition text-center"
          >
            無料で始める
          </Link>
          <Link
            href="/projects"
            className="border border-white text-white font-bold px-6 sm:px-8 py-3 rounded-full hover:bg-white/10 transition text-center"
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
