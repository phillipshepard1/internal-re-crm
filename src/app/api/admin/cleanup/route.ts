import { NextRequest, NextResponse } from 'next/server'
import { cleanupOrphanedFollowUps, validatePeopleData, cleanupInvalidPeople } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (!action) {
      return NextResponse.json({ 
        success: false, 
        error: 'Action is required' 
      }, { status: 400 })
    }
    
    switch (action) {
      case 'validate_people':
        try {
          const validationIssues = await validatePeopleData()
          return NextResponse.json({ 
            success: true, 
            action: 'validate_people',
            issues: validationIssues,
            count: validationIssues.length
          })
        } catch (error) {
          console.error('Validation error:', error)
          return NextResponse.json({ 
            success: false, 
            error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 })
        }
        
      case 'cleanup_followups':
        try {
          const followupCount = await cleanupOrphanedFollowUps()
          return NextResponse.json({ 
            success: true, 
            action: 'cleanup_followups',
            cleanedUp: followupCount
          })
        } catch (error) {
          console.error('Followup cleanup error:', error)
          return NextResponse.json({ 
            success: false, 
            error: `Followup cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 })
        }
        
      case 'cleanup_people':
        try {
          const peopleCount = await cleanupInvalidPeople()
          return NextResponse.json({ 
            success: true, 
            action: 'cleanup_people',
            cleanedUp: peopleCount
          })
        } catch (error) {
          console.error('People cleanup error:', error)
          return NextResponse.json({ 
            success: false, 
            error: `People cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 })
        }
        
      case 'cleanup_all':
        try {
          const [followupCount, peopleCount] = await Promise.all([
            cleanupOrphanedFollowUps(),
            cleanupInvalidPeople()
          ])
          return NextResponse.json({ 
            success: true, 
            action: 'cleanup_all',
            followupsCleanedUp: followupCount,
            peopleCleanedUp: peopleCount
          })
        } catch (error) {
          console.error('Full cleanup error:', error)
          return NextResponse.json({ 
            success: false, 
            error: `Full cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 })
        }
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: validate_people, cleanup_followups, cleanup_people, or cleanup_all' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Cleanup route error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 