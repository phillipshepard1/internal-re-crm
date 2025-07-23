import { NextRequest, NextResponse } from 'next/server'
import { detectLeadSourceFromEmail } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Test email detection
    const detectedSource = await detectLeadSourceFromEmail(email)

    return NextResponse.json({
      success: true,
      email,
      detected_source: detectedSource,
      message: detectedSource 
        ? `Email detected as lead source: ${detectedSource.name}`
        : 'No lead source detected for this email'
    })

  } catch (error) {
    console.error('Error testing email detection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 