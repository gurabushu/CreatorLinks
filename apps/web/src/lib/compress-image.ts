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
      // Skip compression if already small enough
      if (width <= maxWidth && height <= maxHeight && file.size < 300 * 1024) {
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

      const outputName = file.name.replace(/\.[^.]+$/, '.jpg')
      canvas.toBlob(
        (blob) => resolve(new File([blob!], outputName, { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      )
    }

    img.src = objectUrl
  })
}
