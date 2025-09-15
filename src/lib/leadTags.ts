import { supabase } from './supabase'
import type { LeadTag } from './supabase'

// Get all tags for a person
export async function getPersonTags(personId: string): Promise<LeadTag[]> {
  try {
    const { data, error } = await supabase
      .from('person_lead_tags')
      .select(`
        lead_tags (
          id,
          name,
          color,
          description,
          is_active
        )
      `)
      .eq('person_id', personId)

    if (error) {
      console.error('Error fetching person tags:', error)
      return []
    }

    // Extract the lead_tags from the response
    const tags = data?.map(item => (item as any).lead_tags).filter(Boolean) || []
    return tags
  } catch (error) {
    console.error('Error in getPersonTags:', error)
    return []
  }
}

// Add a single tag to a person
export async function addPersonTag(personId: string, tagId: string, userId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('person_lead_tags')
      .insert({
        person_id: personId,
        lead_tag_id: tagId,
        created_by: userId
      })

    if (error) {
      // Ignore duplicate key errors
      if (error.code === '23505') {
        return true
      }
      console.error('Error adding person tag:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in addPersonTag:', error)
    return false
  }
}

// Remove a single tag from a person
export async function removePersonTag(personId: string, tagId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('person_lead_tags')
      .delete()
      .eq('person_id', personId)
      .eq('lead_tag_id', tagId)

    if (error) {
      console.error('Error removing person tag:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in removePersonTag:', error)
    return false
  }
}

// Set all tags for a person (replace existing)
export async function setPersonTags(personId: string, tagIds: string[], userId?: string): Promise<boolean> {
  try {
    // Start a transaction-like operation
    // First, delete all existing tags
    const { error: deleteError } = await supabase
      .from('person_lead_tags')
      .delete()
      .eq('person_id', personId)

    if (deleteError) {
      console.error('Error deleting existing tags:', deleteError)
      return false
    }

    // If no tags to add, we're done
    if (tagIds.length === 0) {
      return true
    }

    // Insert new tags
    const tagsToInsert = tagIds.map(tagId => ({
      person_id: personId,
      lead_tag_id: tagId,
      created_by: userId
    }))

    const { error: insertError } = await supabase
      .from('person_lead_tags')
      .insert(tagsToInsert)

    if (insertError) {
      console.error('Error inserting new tags:', insertError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in setPersonTags:', error)
    return false
  }
}

// Update a person's tags (for backward compatibility with single tag)
export async function updateLeadTagsForLead(
  leadId: string,
  tagIds: string[] | null,
  userId: string
): Promise<void> {
  try {
    if (!tagIds || tagIds.length === 0) {
      // Remove all tags
      await setPersonTags(leadId, [], userId)
    } else {
      // Set the new tags
      await setPersonTags(leadId, tagIds, userId)
    }

    // Also update the activity log
    await supabase
      .from('activities')
      .insert({
        person_id: leadId,
        type: 'updated',
        description: `Lead tags updated`,
        created_by: userId
      })
  } catch (error) {
    console.error('Error updating lead tags:', error)
    throw error
  }
}

// Get people with specific tags (for filtering)
export async function getPeopleByTags(tagIds: string[], userId?: string, userRole?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('person_lead_tags')
      .select('person_id')

    if (tagIds.length === 1) {
      query = query.eq('lead_tag_id', tagIds[0])
    } else {
      query = query.in('lead_tag_id', tagIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching people by tags:', error)
      return []
    }

    // Return unique person IDs
    const personIds = [...new Set(data?.map(item => item.person_id) || [])]
    return personIds
  } catch (error) {
    console.error('Error in getPeopleByTags:', error)
    return []
  }
}

// Check if a person has a specific tag
export async function personHasTag(personId: string, tagId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('person_lead_tags')
      .select('id')
      .eq('person_id', personId)
      .eq('lead_tag_id', tagId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking person tag:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in personHasTag:', error)
    return false
  }
}