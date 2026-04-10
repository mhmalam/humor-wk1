'use server'

import { createClient } from '@/lib/supabase-server'
import type { User } from '@supabase/supabase-js'

/** `caption_votes.profile_id` FK → `profiles.id` (not always equal to `auth.users.id`). */
async function resolveProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User
): Promise<string | null> {
  const { data: byPk } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (byPk?.id) return byPk.id

  if (user.email) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    if (byEmail?.id) return byEmail.id
  }

  return null
}

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

  const profileId = await resolveProfileId(supabase, user)
  if (!profileId) {
    return {
      success: false,
      error: 'No profile row found for this account. Check profiles.id matches your login or email.',
    }
  }

  // caption_votes.profile_id → profiles.id; audit columns use auth user id
  const voteValue = voteType === 'upvote' ? 1 : -1
  const row = {
    caption_id: captionId,
    profile_id: profileId,
    vote_value: voteValue,
    created_by_user_id: user.id,
    modified_by_user_id: user.id,
    is_from_study: false,
  }

  const { data, error } = await supabase
    .from('caption_votes')
    .upsert(row, { onConflict: 'caption_id,profile_id' })
    .select()

  if (error) {
    console.error('Error submitting vote:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  // Intentionally no revalidatePath: avoids RSC refetch / layout flicker after each swipe vote.

  return {
    success: true,
    data,
  }
}
