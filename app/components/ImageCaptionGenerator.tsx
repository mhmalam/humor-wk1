'use client'

import { useState, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { createClient } from '@/lib/supabase-client'

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
]

const API_BASE_URL = 'https://api.almostcrackd.ai'

interface GeneratedCaption {
  [key: string]: any
}

export default function ImageCaptionGenerator() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captions, setCaptions] = useState<GeneratedCaption[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const hasImage = !!previewUrl
  const hasCaptions = !!captions && captions.length > 0

  const setSelectedFile = (selectedFile: File | null) => {
    setError(null)
    setCaptions(null)

    if (!selectedFile) {
      setFile(null)
      setPreviewUrl(null)
      return
    }

    if (!SUPPORTED_TYPES.includes(selectedFile.type)) {
      setError('Unsupported file type. Please upload a JPG, PNG, WEBP, GIF, or HEIC image.')
      setFile(null)
      setPreviewUrl(null)
      return
    }

    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null
    setSelectedFile(selectedFile)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      setSelectedFile(droppedFile)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isDragging) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (isDragging) {
      setIsDragging(false)
    }
  }

  const getDisplayTextForCaption = (caption: GeneratedCaption) => {
    return (
      caption.content ||
      caption.caption ||
      caption.text ||
      caption.title ||
      JSON.stringify(caption)
    )
  }

  const handleGenerateCaptions = async () => {
    if (!file) {
      setError('Please select an image first.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(`Failed to get auth session: ${sessionError.message}`)
      }

      const token = data.session?.access_token

      if (!token) {
        throw new Error('No active session found. Please sign in again.')
      }

      const contentType = file.type || 'image/jpeg'

      // Step 1: Generate presigned URL
      const presignedRes = await fetch(`${API_BASE_URL}/pipeline/generate-presigned-url`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentType }),
      })

      if (!presignedRes.ok) {
        const errorText = await presignedRes.text()
        throw new Error(`Failed to generate presigned URL: ${errorText}`)
      }

      const { presignedUrl, cdnUrl } = await presignedRes.json()

      if (!presignedUrl || !cdnUrl) {
        throw new Error('Presigned URL response is missing required fields.')
      }

      // Step 2: Upload image bytes to presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      })

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        throw new Error(`Failed to upload image: ${errorText}`)
      }

      // Step 3: Register image URL in the pipeline
      const registerRes = await fetch(`${API_BASE_URL}/pipeline/upload-image-from-url`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: cdnUrl,
          isCommonUse: false,
        }),
      })

      if (!registerRes.ok) {
        const errorText = await registerRes.text()
        throw new Error(`Failed to register image: ${errorText}`)
      }

      const { imageId } = await registerRes.json()

      if (!imageId) {
        throw new Error('Image registration response is missing imageId.')
      }

      // Step 4: Generate captions
      const captionsRes = await fetch(`${API_BASE_URL}/pipeline/generate-captions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      })

      if (!captionsRes.ok) {
        const errorText = await captionsRes.text()
        throw new Error(`Failed to generate captions: ${errorText}`)
      }

      const captionsData = await captionsRes.json()

      if (!Array.isArray(captionsData)) {
        throw new Error('Unexpected captions response format.')
      }

      setCaptions(captionsData)
    } catch (err: any) {
      console.error('Caption generation error:', err)
      setError(err.message || 'Something went wrong while generating captions.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mb-10">
      <div className="max-w-5xl mx-auto bg-slate-950/80 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-6 md:p-7">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white font-[family-name:var(--font-space-grotesk)] tracking-tight">
              Meme Caption Studio
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Drop in a meme and we&apos;ll generate multiple caption options side‑by‑side.
            </p>
          </div>
          <div className="hidden sm:flex items-center text-[10px] font-semibold tracking-[0.12em] uppercase">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border ${
                isLoading
                  ? 'border-slate-600 bg-slate-900/90 text-slate-200'
                  : hasCaptions
                  ? 'border-slate-600 bg-slate-900/90 text-slate-200'
                  : hasImage
                  ? 'border-slate-600 bg-slate-900/90 text-slate-200'
                  : 'border-slate-700/80 bg-slate-900/90 text-slate-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLoading
                    ? 'bg-cyan-400/90'
                    : hasCaptions
                    ? 'bg-emerald-400/90'
                    : hasImage
                    ? 'bg-amber-400/90'
                    : 'bg-slate-500'
                }`}
              />
              <span className="whitespace-nowrap">
                {isLoading
                  ? 'Generating…'
                  : hasCaptions
                  ? 'Captions ready'
                  : hasImage
                  ? 'Ready — press Generate'
                  : 'Upload an image'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-1 gap-5 md:gap-6 items-stretch">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative flex flex-col justify-between rounded-2xl border-2 border-dashed px-4 py-5 md:px-5 md:py-6 transition-all cursor-pointer
              ${isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700/90 bg-slate-900/70 hover:border-slate-500'}
            `}
          >
            <label className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-slate-900/80 border border-slate-700/80 px-3 py-1 mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-200 tracking-[0.14em] uppercase">
                  Step 1 · Upload image
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 flex items-center justify-center text-xl">
                  📤
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs md:text-sm font-semibold text-slate-100">
                    Drag & drop or <span className="text-cyan-300 underline-offset-2 underline">browse</span> an image
                  </p>
                  <p className="text-[11px] text-slate-500">
                    JPG, PNG, WEBP, GIF, HEIC · up to ~10MB
                  </p>
                </div>
              </div>

              <input
                type="file"
                accept={SUPPORTED_TYPES.join(',')}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  {hasCaptions ? 'Step 2 · Regenerate' : 'Step 2 · Generate'}
                </span>
                <span className="hidden sm:inline">
                  {hasCaptions ? (
                    <>
                      Want a new batch? Press{' '}
                      <span className="font-semibold text-emerald-200">Regenerate captions</span>.
                    </>
                  ) : (
                    <>
                      Press <span className="font-semibold text-emerald-200">Generate captions</span> to run the pipeline.
                    </>
                  )}
                </span>
                <span className="sm:hidden">
                  {hasCaptions ? (
                    <>
                      Tap <span className="font-semibold text-emerald-200">Regenerate</span> for new options.
                    </>
                  ) : (
                    <>
                      Tap <span className="font-semibold text-emerald-200">Generate</span> below.
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={handleGenerateCaptions}
                disabled={!file || isLoading}
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[11px] font-semibold
                  bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-400 text-slate-950
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:from-blue-400 hover:via-cyan-400 hover:to-emerald-300 transition-colors duration-150"
              >
                {isLoading ? (
                  <>
                    <span className="mr-1.5 inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    {hasCaptions ? 'Regenerating...' : 'Generating...'}
                  </>
                ) : (
                  <>{hasCaptions ? 'Regenerate captions' : 'Generate captions'}</>
                )}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-[11px] text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
        {previewUrl && (
          <div className="mt-4 border border-slate-800/80 rounded-2xl bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] md:text-xs text-slate-400 gap-2">
              <span className="font-semibold text-slate-200">
                Caption gallery
              </span>
              <span className="text-right">
                {captions && captions.length > 0
                  ? `Showing all ${captions.length} caption${captions.length === 1 ? '' : 's'} — scroll sideways`
                  : 'Placeholder preview (5 slots)'}
              </span>
            </div>
            <div className="flex items-stretch gap-4 pb-2 overflow-x-auto overflow-y-visible [-webkit-overflow-scrolling:touch]">
              {(captions && captions.length > 0
                ? captions
                : Array.from({ length: 5 }, () => null)
              ).map((caption, index) => (
                <div
                  key={(caption as any)?.id ?? index}
                  className="min-w-[140px] max-w-[180px] w-[28vw] sm:w-[160px] flex-shrink-0"
                >
                  <div className="relative w-full aspect-[4/5] rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden transition-transform duration-150 hover:-translate-y-1 hover:shadow-xl">
                    <img
                      src={previewUrl}
                      alt="Caption preview"
                      className="w-full h-full object-cover bg-slate-900"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/70 text-[10px] text-slate-100 border border-slate-700/80">
                      #{index + 1}
                    </div>
                    <div className="absolute bottom-3 left-2.5 right-2.5">
                      {captions && captions.length > 0 ? (
                        <p className="text-[11px] md:text-xs text-slate-50 text-center leading-snug line-clamp-4">
                          {getDisplayTextForCaption(
                            (caption || {}) as GeneratedCaption
                          )}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full bg-slate-600/70 w-4/5 mx-auto" />
                          <div className="h-1.5 rounded-full bg-slate-700/70 w-3/5 mx-auto" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}