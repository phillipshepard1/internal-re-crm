'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function TestDBPage() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [roundRobinUsers, setRoundRobinUsers] = useState<any[]>([])

  const testConnection = async () => {
    try {
      setStatus('Testing connection...')
      setError('')
      
      // Test basic connection
      const { data, error: connError } = await supabase
        .from('round_robin_config')
        .select('count')
        .limit(1)
      
      if (connError) {
        setError(`Connection error: ${connError.message}`)
        setStatus('Failed')
        return
      }
      
      setStatus('Connection successful!')
      
      // Test table structure
      const { data: tableData, error: tableError } = await supabase
        .from('round_robin_config')
        .select('*')
        .limit(5)
      
      if (tableError) {
        setError(`Table error: ${tableError.message}`)
      } else {
        setStatus(`Connection successful! Found ${tableData?.length || 0} records in round_robin_config`)
        setRoundRobinUsers(tableData || [])
      }
      
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
      setStatus('Failed')
    }
  }

  const loadUsers = async () => {
    try {
      setStatus('Loading users...')
      
      // Try to get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        setError(`Error getting current user: ${userError.message}`)
        return
      }
      
      if (!user) {
        setError('No authenticated user found')
        return
      }
      
      // For now, let's just show the current user and allow manual entry
      setUsers([user])
      setStatus(`Found current user: ${user.email}`)
      
    } catch (err: any) {
      setError(`Error loading users: ${err.message}`)
    }
  }

  const addUserToRoundRobin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('round_robin_config')
        .insert([{ user_id: userId, is_active: true, priority: 0 }])
      
      if (error) {
        setError(`Error adding user: ${error.message}`)
        return
      }
      
      setStatus('User added to Round Robin successfully!')
      testConnection() // Refresh the list
    } catch (err: any) {
      setError(`Error adding user: ${err.message}`)
    }
  }

  const addManualUser = async () => {
    const userId = prompt('Enter user ID to add to Round Robin:')
    if (userId && userId.trim()) {
      await addUserToRoundRobin(userId.trim())
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={testConnection} className="mr-4">
          Test Database Connection
        </Button>
        
        <Button onClick={loadUsers} variant="outline" className="mr-4">
          Load Current User
        </Button>
        
        <Button onClick={addManualUser} variant="outline">
          Add User Manually
        </Button>
      </div>
      
      {status && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <strong>Status:</strong> {status}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {users.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Available Users</h2>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <strong>{user.email}</strong>
                  <div className="text-sm text-gray-600">ID: {user.id}</div>
                </div>
                <Button 
                  onClick={() => addUserToRoundRobin(user.id)}
                  size="sm"
                >
                  Add to Round Robin
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {roundRobinUsers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Round Robin Users</h2>
          <div className="space-y-2">
            {roundRobinUsers.map((config) => (
              <div key={config.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>User ID:</strong> {config.user_id}
                    <div className="text-sm text-gray-600">
                      Active: {config.is_active ? 'Yes' : 'No'} | Priority: {config.priority}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Test the database connection first</li>
          <li>Load your current user or add users manually</li>
          <li>Add users to the Round Robin configuration</li>
          <li>Test lead ingestion in the admin panel</li>
        </ol>
        
        <h3 className="text-lg font-semibold mt-4 mb-2">To add other users:</h3>
        <p className="text-sm text-gray-600">
          Since we can't list all users due to permissions, you can:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Use "Add User Manually" and enter the user ID</li>
          <li>Get user IDs from your Supabase dashboard</li>
          <li>Or create a simple admin function to list users</li>
        </ul>
      </div>
    </div>
  )
} 