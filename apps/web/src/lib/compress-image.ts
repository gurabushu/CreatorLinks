// HEIC/HEIF (iPhone) など canvas で読めない形式は早期に弾く
const UNSUPPORTED_TYPES = ['image/heic', 'image/heif']
const LOAD_TIMEOUT_MS = 15_000

export async function compressImage(
  file: File,
  {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
  }: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (UNSUPPORTED_TYPES.includes(file.type)) {
    throw new Error('この画像形式（HEIC/HEIF）は対応していません。JPG / PNG / WebP で再アップロードしてください。')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)

    let { width, height } = img
    if (width <= maxWidth && height <= maxHeight && file.size < 100 * 1024) {
      return file
    }

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    // WebP はJPEGより30〜40%小さい。Safari16+/Chrome/Firefoxすべて対応
    const useWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    const mime = useWebP ? 'image/webp' : 'image/jpeg'
    const ext = useWebP ? '.webp' : '.jpg'
    const outputName = file.name.replace(/\.[^.]+$/, ext)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    )
    // canvas.toBlob が null を返したら（メモリ不足など）元ファイルにフォールバック
    if (!blob) return file
    return new File([blob], outputName, { type: mime })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => {
      reject(new Error('画像の読み込みがタイムアウトしました。'))
    }, LOAD_TIMEOUT_MS)

    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('画像を読み込めませんでした。ファイルが破損しているか、対応していない形式の可能性があります。'))
    }
    img.src = src
  })
}
