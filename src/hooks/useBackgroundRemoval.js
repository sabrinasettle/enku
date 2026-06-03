import { useState, useCallback } from 'react'
import { removeBackground } from '@imgly/background-removal'

async function toPng(file) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    )
  })
}

// Convert file for display without background removal (HEIC-safe fallback).
export async function fileToDisplayBlob(file) {
  try {
    return await toPng(file)
  } catch {
    return file
  }
}

export function useBackgroundRemoval() {
  const [processing, setProcessing] = useState(false)

  // Returns { blob, url } so callers can persist the blob.
  const removeFromFile = useCallback(async (file) => {
    setProcessing(true)
    try {
      let source
      try { source = await toPng(file) } catch { source = file }
      const blob = await removeBackground(source)
      return { blob, url: URL.createObjectURL(blob) }
    } finally {
      setProcessing(false)
    }
  }, [])

  return { removeFromFile, processing }
}
