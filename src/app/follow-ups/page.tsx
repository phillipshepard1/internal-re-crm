'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function FollowUpsPage() {
  const [error] = useState('')

  // ...rest of your follow-ups page logic

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <h2 className="text-3xl font-bold tracking-tight">Follow Ups</h2>
      {/* Follow-ups content here */}
    </div>
  )
} 