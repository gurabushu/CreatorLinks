export async function compressImage(
  file: File,
  {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
  }: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width <= maxWidth && height <= maxHeight && file.size < 100 * 1024) {
        resolve(file)
        return
      }

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      // WebP はJPEGより30〜40%小さい。Safari16+/Chrome/Firefoxすべて対応
      const webpTest = canvas.toDataURL('image/webp')
      const useWebP = webpTest.startsWith('data:image/webp')
      const mime = useWebP ? 'image/webp' : 'image/jpeg'
      const ext = useWebP ? '.webp' : '.jpg'
      const outputName = file.name.replace(/\.[^.]+$/, ext)

      canvas.toBlob(
        (blob) => resolve(new File([blob!], outputName, { type: mime })),
        mime,
        quality
      )
    }

    img.src = objectUrl
  })
}
