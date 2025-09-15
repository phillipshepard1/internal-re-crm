import { supabase } from './supabase'
import type { CustomLeadTab } from './supabase'

// Get all active custom tabs for a user
export async function getCustomTabs(userId: string): Promise<CustomLeadTab[]> {
  try {
    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('tab_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching custom tabs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getCustomTabs:', error)
    return []
  }
}

// Create a new custom tab
export async function createCustomTab(
  userId: string,
  tab: Omit<CustomLeadTab, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<CustomLeadTab | null> {
  try {
    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .insert({
        user_id: userId,
        ...tab
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom tab:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createCustomTab:', error)
    return null
  }
}

// Update an existing custom tab
export async function updateCustomTab(
  userId: string,
  tabId: string,
  updates: Partial<Omit<CustomLeadTab, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<CustomLeadTab | null> {
  try {
    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', tabId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating custom tab:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateCustomTab:', error)
    return null
  }
}

// Delete a custom tab (soft delete)
export async function deleteCustomTab(userId: string, tabId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('custom_lead_tabs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', tabId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting custom tab:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteCustomTab:', error)
    return false
  }
}

// Reorder custom tabs
export async function reorderCustomTabs(
  userId: string,
  tabOrders: { id: string; order: number }[]
): Promise<boolean> {
  try {
    // Update each tab's order
    const promises = tabOrders.map(({ id, order }) =>
      supabase
        .from('custom_lead_tabs')
        .update({
          tab_order: order,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
    )

    const results = await Promise.all(promises)
    const hasError = results.some(result => result.error)

    if (hasError) {
      console.error('Error reordering custom tabs')
      return false
    }

    return true
  } catch (error) {
    console.error('Error in reorderCustomTabs:', error)
    return false
  }
}