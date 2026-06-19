/**
 * Redimensiona uma imagem do <input type="file"> para um quadrado e retorna
 * como data URL JPEG comprimido. Ideal para avatars.
 *
 * MODO `contain` (padrão):
 *   - Preserva a imagem INTEIRA dentro do quadrado
 *   - Centraliza com padding (cor de fundo configurável) onde sobrar espaço
 *   - Ninguém perde detalhe — bom pra logos, retratos, ícones
 *
 * MODO `cover`:
 *   - Preenche todo o quadrado, croppando bordas se a imagem não for quadrada
 *   - Bom quando quer evitar padding mas ok perder parte da imagem
 *
 * Saída típica: 256×256 JPEG 85% → ~10–20 KB
 */
export async function resizeAndCropImage(
  file: File,
  size = 256,
  quality = 0.85,
  fit: 'contain' | 'cover' = 'contain',
  background = '#FFFFFF'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem')
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')

    // Fundo (necessário pra JPEG, que não tem alpha)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size, size)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (fit === 'cover') {
      // Crop central: pega o quadrado central da imagem e escala
      const srcSize = Math.min(img.width, img.height)
      const sx = (img.width - srcSize) / 2
      const sy = (img.height - srcSize) / 2
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size)
    } else {
      // contain: escala a imagem TODA para caber no quadrado, centraliza
      const scale = Math.min(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const dx = (size - w) / 2
      const dy = (size - h) / 2
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, w, h)
    }

    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Redimensiona uma imagem para uso em texto rico (descrição/observações),
 * PRESERVANDO a proporção, e devolve um File WebP comprimido pronto pra upload.
 *
 * Diferente de `resizeAndCropImage` (avatar quadrado → data URL), aqui:
 *   - não corta nem força quadrado — mantém o aspecto original
 *   - limita só a maior dimensão a `maxDim` (downscale; nunca amplia)
 *   - retorna File (não data URL) pra subir ao Vercel Blob via /api/upload
 *   - WebP preserva texto de prints nítido e pesa menos que JPEG
 *
 * GIF é devolvido intacto (canvas perderia a animação).
 * Saída típica: print/foto de vários MB → ~150–300 KB.
 */
export async function resizeImageForUpload(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem')
  }
  if (file.type === 'image/gif') return file // preserva animação

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )
    if (!blob) throw new Error('Falha ao processar a imagem')

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'))
    img.src = src
  })
}
