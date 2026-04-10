'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { submitVote } from '@/app/actions/voteActions'

interface Image {
  id: string
  url: string
  [key: string]: any
}

interface Caption {
  id: string
  content: string
  image_id: string
  url?: string
  images?: Image | null
  [key: string]: any
}

interface SwipeableCardsProps {
  captions: Caption[]
  userId: string
  /** Taller deck: page hides footer while voting */
  compactChrome?: boolean
}

export default function SwipeableCards({
  captions,
  userId,
  compactChrome = false,
}: SwipeableCardsProps) {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmittingVote, setIsSubmittingVote] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  /** Hide image until decoded so we don’t flash the previous card’s bitmap */
  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setImageError(false)
  }, [currentIndex])

  useLayoutEffect(() => {
    setImageReady(false)
  }, [currentIndex])

  useEffect(() => {
    if (!mounted) return

    const preloadImages = () => {
      for (let i = currentIndex + 1; i <= Math.min(currentIndex + 3, captions.length - 1); i++) {
        const url = captions[i]?.images?.url || captions[i]?.url
        if (url) {
          const img = new window.Image()
          img.src = `/api/image?url=${encodeURIComponent(url)}`
        }
      }
    }

    preloadImages()
  }, [mounted, currentIndex, captions])

  const currentCaption = captions[currentIndex]

  const deckHeightClass = compactChrome
    ? 'h-[calc(100dvh-12rem)] max-h-[min(720px,calc(100dvh-12rem))]'
    : 'h-[calc(100dvh-17rem)] max-h-[640px]'

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!currentCaption || isSubmittingVote || !userId) return

    setVoteError(null)
    setIsSubmittingVote(true)

    try {
      const result = await submitVote(currentCaption.id, voteType)
      if (result.success) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setVoteError(result.error ?? 'Vote failed')
      }
    } catch (e: unknown) {
      setVoteError(e instanceof Error ? e.message : 'Vote failed')
    } finally {
      setIsSubmittingVote(false)
    }
  }

  if (!mounted) {
    return (
      <div
        className={`flex min-h-[280px] w-full max-w-md mx-auto flex-col items-center justify-center gap-3 px-3 ${deckHeightClass}`}
      >
        <div className="flex-1 min-h-0 w-full rounded-2xl bg-slate-800 animate-pulse" />
        <div className="flex shrink-0 gap-5 justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800 rounded-full animate-pulse" />
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800 rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  if (!currentCaption) {
    return (
      <div
        className={`flex min-h-[240px] w-full max-w-md mx-auto flex-col items-center justify-center gap-3 px-3 text-center ${deckHeightClass}`}
      >
        <div className="text-5xl sm:text-6xl">🎉</div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">All caught up</h2>
        <p className="text-slate-400 text-sm">You&apos;ve rated every caption in the feed.</p>
        <button
          type="button"
          onClick={() => setCurrentIndex(0)}
          className="mt-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Start over
        </button>
      </div>
    )
  }

  const imageUrl = currentCaption.images?.url || currentCaption.url
  const imageSrc = imageUrl ? `/api/image?url=${encodeURIComponent(imageUrl)}` : undefined

  return (
    <div
      className={`flex min-h-[280px] w-full max-w-md mx-auto flex-col items-stretch gap-2 px-3 min-h-0 ${deckHeightClass}`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="relative min-h-0 flex-1 w-full rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
          {!imageError && imageSrc ? (
            <img
              key={currentCaption.id}
              src={imageSrc}
              alt=""
              className={`h-full w-full object-cover transition-opacity duration-200 ease-out ${
                imageReady ? 'opacity-100' : 'opacity-0'
              }`}
              loading="eager"
              fetchPriority="high"
              onLoad={() => setImageReady(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-800 p-4">
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-slate-400 text-center text-xs">Image unavailable</p>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageError(false)}
                  className="mt-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {!imageError && imageSrc && (
            <>
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-opacity duration-200 ease-out ${
                  imageReady ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <div
                className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 transition-opacity duration-200 ease-out ${
                  imageReady ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <p className="text-center text-base sm:text-lg font-bold leading-snug text-white line-clamp-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
                  {currentCaption.content}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-center gap-5 sm:gap-6 py-1">
          <button
            type="button"
            disabled={isSubmittingVote}
            onClick={() => handleVote('downvote')}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-4xl shadow-lg transition-all hover:bg-red-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 sm:h-16 sm:w-16 sm:text-5xl"
            aria-label="Thumbs down"
          >
            👎
          </button>

          <button
            type="button"
            disabled={isSubmittingVote}
            onClick={() => handleVote('upvote')}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-4xl shadow-lg transition-all hover:bg-green-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 sm:h-16 sm:w-16 sm:text-5xl"
            aria-label="Thumbs up"
          >
            👍
          </button>
        </div>

        {isSubmittingVote && (
          <p className="shrink-0 text-center text-xs text-slate-400">Saving vote…</p>
        )}
        {voteError && (
          <p className="shrink-0 text-center text-xs text-red-400" role="alert">
            {voteError}
          </p>
        )}
      </div>
    </div>
  )
}
