'use client'

import { useState } from 'react'
import ImageCaptionGenerator from './ImageCaptionGenerator'
import SwipeableCards from './SwipeableCards'

interface Image {
  id: string
  url: string
  [key: string]: unknown
}

interface Caption {
  id: string
  content: string
  image_id: string
  images?: Image | null
  [key: string]: unknown
}

interface HomeWorkspaceProps {
  captions: Caption[] | null
  userId: string
  captionsErrorMessage: string | null
}

export default function HomeWorkspace({
  captions,
  userId,
  captionsErrorMessage,
}: HomeWorkspaceProps) {
  const [tab, setTab] = useState<'vote' | 'create'>('vote')

  return (
    <div>
      <div
        className={`flex justify-center gap-1 rounded-2xl border border-slate-800/90 bg-slate-950/60 p-1 max-w-md mx-auto ${tab === 'vote' ? 'mb-3' : 'mb-8'}`}
        role="tablist"
        aria-label="Main sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vote'}
          onClick={() => setTab('vote')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'vote'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Vote on captions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'create'}
          onClick={() => setTab('create')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'create'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Upload &amp; generate
        </button>
      </div>

      {tab === 'create' && <ImageCaptionGenerator />}

      {captionsErrorMessage && (
        <div className="mb-12 p-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl shadow-sm">
          <p className="text-red-700 dark:text-red-300 text-base">
            Error loading captions: {captionsErrorMessage}
          </p>
        </div>
      )}

      {tab === 'vote' && (
        <div className="flex min-h-0 items-stretch justify-center">
          {captions && captions.length > 0 ? (
            <SwipeableCards captions={captions} userId={userId} compactChrome />
          ) : !captionsErrorMessage ? (
            <div className="text-center py-8 px-4">
              <div className="text-5xl mb-3 opacity-50">💭</div>
              <p className="text-slate-400 text-base">No captions found yet</p>
              <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                Use <span className="text-slate-300">Upload &amp; generate</span> to add
                meme captions, then vote here.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {!(tab === 'vote' && captions && captions.length > 0) && (
        <footer className="mt-4 sm:mt-8 text-center pb-3 sm:pb-4">
          <p className="text-slate-600 text-xs font-[family-name:var(--font-space-grotesk)] tracking-wide">
            THE HUMOR PROJECT
          </p>
        </footer>
      )}
    </div>
  )
}
