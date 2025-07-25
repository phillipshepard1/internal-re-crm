import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Import the shared processing function
    const { processEmailAsLead } = await import('@/lib/emailProcessing')
    
    // Process the email using the shared function
    const result = await processEmailAsLead(body)
    
    // Convert the result to NextResponse
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { 
          error: result.error || result.message,
          details: result.details
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing email as lead:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
} 