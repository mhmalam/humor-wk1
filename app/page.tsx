import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import { getCachedImages } from '@/lib/imageCache'
import ImageGallery from './components/ImageGallery'
import LoginGate from './components/LoginGate'
import UserProfile from './components/UserProfile'
import HomeWorkspace from './components/HomeWorkspace'

interface Image {
  id: string
  url: string
  [key: string]: any
}

interface Caption {
  id: string
  content: string
  image_id: string
  images?: Image
  [key: string]: any
}

export default async function Home() {
  // Check authentication
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  // If not authenticated, show login gate
  if (!user) {
    return <LoginGate />
  }

  // Fetch captions
  const { data: captionsData, error: captionsError } = await supabase
    .from('captions')
    .select('*')
    .not('image_id', 'is', null)

  let captions = null

  // Fetch images separately and join manually
  if (captionsData && captionsData.length > 0) {
    const imageIds = captionsData.map(c => c.image_id).filter(Boolean)
    
    console.log('Image IDs to fetch:', imageIds.slice(0, 5)) // Log first 5
    
    const { data: imagesData } = await supabase
      .from('images')
      .select('id, url')
      .in('id', imageIds)
    
    console.log('Images fetched from DB:', imagesData?.slice(0, 5)) // Log first 5
    
    // Join manually and filter out captions without images
    captions = captionsData
      .map(caption => {
        const matchedImage = imagesData?.find(img => img.id === caption.image_id)
        if (!matchedImage) {
          console.warn('No image found for caption:', caption.id, 'image_id:', caption.image_id)
        }
        return {
          ...caption,
          images: matchedImage || null
        }
      })
      .filter(caption => caption.images !== null) // Only keep captions with images
  }

  const error = captionsError

  console.log('Final captions with images:', captions?.slice(0, 2)) // Log first 2 for debugging

  // Get cached images (instant after first load)
  const images = await getCachedImages()

  if (error) {
    console.error('Error fetching captions:', error)
  }

  return (
    <div className="min-h-screen bg-slate-950 font-[family-name:var(--font-inter)]">
      {/* Background container with gallery */}
      <div className="fixed inset-0 overflow-hidden">
        <ImageGallery images={images} />
        
        {/* Clean gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-transparent pointer-events-none z-[1]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/70 pointer-events-none z-[1]"></div>
      </div>

      {/* Floating Course Badge - Clean */}
      <div className="fixed top-4 left-4 z-50 font-[family-name:var(--font-space-grotesk)]">
        <div className="bg-slate-800 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 hover:scale-105 transition-all duration-300">
          <div className="flex items-center gap-2">
            <span className="text-lg">😂</span>
            <div>
              <p className="font-bold text-[10px] tracking-wide leading-tight">THE HUMOR</p>
              <p className="font-bold text-[10px] tracking-wide leading-tight">PROJECT</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6 pt-16 sm:pt-20 max-w-6xl relative z-10">
        {/* Hero Header — compact vertical rhythm so vote tab fits one screen */}
        <header className="mb-3 sm:mb-4 text-center relative px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 tracking-tight font-[family-name:var(--font-space-grotesk)] uppercase">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">MEME </span>
            <span className="text-white">CAPTION LAB</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto font-medium leading-snug">
            Upload a meme to generate captions, or swipe through the feed to vote.
          </p>
        </header>

        <HomeWorkspace
          captions={captions}
          userId={user.id}
          captionsErrorMessage={error?.message ?? null}
        />
      </div>

      {/* User Profile Button */}
      <UserProfile user={user} />
    </div>
  )
}
