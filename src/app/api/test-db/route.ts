import { NextResponse } from 'next/server'
import { testDatabaseConnection } from '@/lib/database'

export async function GET() {
  try {
    const startTime = Date.now()
    const result = await testDatabaseConnection()
    const totalTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      database: result,
      totalResponseTime: totalTime,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database test API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 