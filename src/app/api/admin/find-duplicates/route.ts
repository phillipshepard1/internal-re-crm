import { NextRequest, NextResponse } from 'next/server'
import { findDuplicatePeopleByEmail, mergeDuplicatePeople } from '@/lib/emailProcessing'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (you may want to add proper authentication here)
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
    
    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const duplicates = await findDuplicatePeopleByEmail()

    return NextResponse.json({
      success: true,
      data: duplicates
    })

  } catch (error) {
    console.error('Error finding duplicates:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
    
    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { primaryPersonId, duplicatePersonIds } = body

    if (!primaryPersonId || !duplicatePersonIds || !Array.isArray(duplicatePersonIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: primaryPersonId and duplicatePersonIds array' },
        { status: 400 }
      )
    }

    const result = await mergeDuplicatePeople(primaryPersonId, duplicatePersonIds)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      })
    } else {
      return NextResponse.json(
        { 
          error: result.message,
          details: result.error
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error merging duplicates:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}