export async function applyWatermarkToBase64(base64: string, userName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, canvas.height - 56, canvas.width, 56)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px monospace'
      const now = new Date().toLocaleString('es-MX')
      ctx.fillText(`${userName} · ${now}`, 12, canvas.height - 32)
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillText('ID: verificando…', 12, canvas.height - 12)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

// Returns the data URL with watermark if on native platform, null if on web (caller uses getUserMedia).
export async function captureNativePhoto(userName: string): Promise<string> {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) {
    throw new Error('captureNativePhoto called on non-native platform')
  }
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const perms = await Camera.requestPermissions({ permissions: ['camera'] })
  if (perms.camera !== 'granted') {
    throw new Error('Permiso de cámara denegado. Actívalo en la configuración del dispositivo.')
  }
  const image = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
  })
  return applyWatermarkToBase64(image.base64String!, userName)
}

export function isNativePlatform(): boolean {
  // Capacitor sets window.Capacitor when running inside a native WebView
  return typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Capacitor?.isNativePlatform?.() === true
}
