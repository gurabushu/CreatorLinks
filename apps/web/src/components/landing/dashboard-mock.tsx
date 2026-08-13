// Hero 右側のダッシュボード＋スマホのビジュアルモック。
// 純粋なマークアップで、色は既存トークン (purple/gray) を維持する。

import { SITE_NAME } from '@/lib/brand'

export function DashboardMock() {
  return (
    <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto">
      {/* 背景のドットネットワーク */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full text-purple-200"
        viewBox="0 0 600 450"
        fill="none"
      >
        <g stroke="currentColor" strokeWidth="1" opacity="0.6">
          <line x1="60" y1="80" x2="180" y2="150" />
          <line x1="180" y1="150" x2="90" y2="260" />
          <line x1="90" y1="260" x2="220" y2="360" />
          <line x1="180" y1="150" x2="320" y2="60" />
          <line x1="320" y1="60" x2="480" y2="120" />
          <line x1="480" y1="120" x2="540" y2="260" />
          <line x1="540" y1="260" x2="440" y2="380" />
          <line x1="440" y1="380" x2="300" y2="410" />
          <line x1="300" y1="410" x2="220" y2="360" />
        </g>
        <g fill="currentColor">
          {[
            [60, 80], [180, 150], [90, 260], [220, 360],
            [320, 60], [480, 120], [540, 260], [440, 380], [300, 410],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="5" />
          ))}
        </g>
      </svg>

      {/* デスクトップ枠 */}
      <div className="absolute left-[4%] top-[8%] w-[86%] rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex">
          {/* サイドバー */}
          <aside className="w-[28%] bg-gray-50 p-3 border-r">
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-indigo-600" />
              <span className="text-[10px] font-bold text-gray-800">{SITE_NAME}</span>
            </div>
            <ul className="space-y-1.5 text-[9px]">
              <li className="flex items-center gap-1.5 px-2 py-1 rounded bg-white text-purple-700 font-semibold">
                <span className="w-1 h-1 rounded-full bg-purple-600" /> ホーム
              </li>
              <li className="px-2 py-1 text-gray-500">案件を探す</li>
              <li className="px-2 py-1 text-gray-500">クリエイターを探す</li>
              <li className="px-2 py-1 text-gray-500">メッセージ</li>
              <li className="px-2 py-1 text-gray-500">お気に入り</li>
              <li className="px-2 py-1 text-gray-500">マイページ</li>
            </ul>
          </aside>

          {/* メイン */}
          <div className="flex-1 p-3">
            <div className="h-5 rounded bg-gray-100 mb-3" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-800">おすすめの案件</span>
              <span className="text-[9px] text-purple-600">すべて見る</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {['LPデザイン制作', 'Webアプリ開発', '動画編集'].map((title, i) => (
                <div key={title} className="rounded-md ring-1 ring-gray-200 p-1.5">
                  <span className="inline-block text-[7px] bg-emerald-100 text-emerald-700 px-1 rounded">
                    募集中
                  </span>
                  <div className="text-[9px] font-semibold text-gray-800 mt-0.5 truncate">{title}</div>
                  <div className="text-[7px] text-gray-500">
                    {['Webデザイン', '開発・エンジニア', '映像・動画'][i]}
                  </div>
                  <div className="text-[9px] font-bold text-gray-900 mt-0.5">
                    {['¥120,000〜', '¥300,000〜', '¥50,000〜'][i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-800">人気のクリエイター</span>
              <span className="text-[9px] text-purple-600">すべて見る</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {['Yuki', 'Keita', 'Mana'].map((name) => (
                <div key={name} className="rounded-md ring-1 ring-gray-200 p-1.5 text-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-200 to-indigo-300 mx-auto mb-1" />
                  <div className="text-[9px] font-semibold text-gray-800">{name}</div>
                  <div className="text-[7px] text-gray-500">Webデザイナー</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* スマホ枠 (右下重ね) */}
      <div className="absolute right-[2%] bottom-[2%] w-[28%] rounded-[18px] bg-white shadow-2xl ring-1 ring-gray-200 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-gradient-to-br from-purple-500 to-indigo-600" />
            <span className="text-[8px] font-bold">{SITE_NAME}</span>
          </div>
          <div className="w-3 h-0.5 bg-gray-400 rounded" />
        </div>
        <div className="text-[8px] font-semibold text-gray-800 mb-1">あなたへのおすすめ</div>
        <div className="rounded-md ring-1 ring-gray-200 p-1.5 mb-1.5">
          <div className="text-[8px] font-semibold text-gray-800">ロゴデザイン制作</div>
          <div className="text-[7px] text-gray-500">Webデザイン</div>
          <div className="text-[8px] font-bold text-gray-900 mt-0.5">¥80,000〜</div>
        </div>
        <div className="text-[8px] font-semibold text-gray-800 mb-1">注目のクリエイター</div>
        <div className="rounded-md ring-1 ring-gray-200 p-1.5 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-200 to-indigo-300" />
          <div className="flex-1">
            <div className="text-[8px] font-semibold text-gray-800">RYO</div>
            <div className="text-[7px] text-gray-500">グラフィックデザイナー</div>
          </div>
        </div>
        <div className="mt-1.5 h-4 rounded bg-purple-50 ring-1 ring-purple-200 flex items-center justify-center">
          <span className="text-[7px] font-semibold text-purple-700">プロフィールを見る</span>
        </div>
      </div>
    </div>
  )
}
