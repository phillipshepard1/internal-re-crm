import { NextRequest, NextResponse } from 'next/server'
import { createFile } from '@/lib/database'
import { supabaseServer } from '@/lib/supabase-server'
import type { File as FileRecord } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const personId = formData.get('personId') as string

    const userId = formData.get('userId') as string

    if (!file || !personId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}-${file.name}`
    const filePath = `${personId}/${uniqueFilename}`

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabaseServer.storage
      .from('internal-re-crm-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabaseServer.storage
      .from('internal-re-crm-files')
      .getPublicUrl(filePath)

    // Save file metadata to database
    const newFile = await createFile({
      person_id: personId,
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: userId,
    } as Partial<FileRecord>)

    return NextResponse.json({
      success: true,
      file: newFile,
      publicUrl: urlData.publicUrl,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 