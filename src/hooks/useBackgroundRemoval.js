import { useState, useCallback } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { fileToDisplayBlob, fileToPngBlob } from '../utils/imageFiles'

export { fileToDisplayBlob }

export function useBackgroundRemoval() {
  const [processing, setProcessing] = useState(false)

  // Returns { blob, url } so callers can persist the blob.
  const removeFromFile = useCallback(async (file) => {
    setProcessing(true)
    try {
      let source
      try { source = await fileToPngBlob(file) } catch { source = file }
      const blob = await removeBackground(source)
      return { blob, url: URL.createObjectURL(blob) }
    } finally {
      setProcessing(false)
    }
  }, [])

  return { removeFromFile, processing }
}
