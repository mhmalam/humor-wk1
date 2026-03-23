'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function submitVote(captionId: string, voteType: 'upvote' | 'downvote') {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Auth error:', authError)
    return { 
      success: false, 
      error: 'You must be logged in to vote' 
    }
  }

  // Convert vote type to numeric value: upvote = 1, downvote = -1
  const voteValue = voteType === 'upvote' ? 1 : -1
  
  const voteData = {
    caption_id: captionId,
    profile_id: user.id,
    vote_value: voteValue,
    created_by_user_id: user.id,
    modified_by_user_id: user.id
  }

  console.log('Inserting vote with data:', voteData)

  const { data, error } = await supabase
    .from('caption_votes')
    .insert(voteData)
    .select()

  if (error) {
    console.error('Error submitting vote:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return { 
      success: false, 
      error: `Database error: ${error.message}. Details: ${error.details || 'none'}. Hint: ${error.hint || 'none'}`
    }
  }

  console.log('Vote inserted successfully:', data)
  revalidatePath('/')
  
  return { 
    success: true, 
    data 
  }
}
