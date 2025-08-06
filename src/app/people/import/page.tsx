'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { createPerson } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'

interface ParsedPerson {
  first_name: string
  last_name: string
  email: string
  phone?: string
  company?: string
  position?: string
  street_address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
}

interface ValidationError {
  row: number
  errors: string[]
}

export default function ImportPeoplePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedPerson[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      parseCSV(selectedFile)
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file',
        variant: 'destructive'
      })
    }
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast({
          title: 'Invalid CSV',
          description: 'CSV file must have a header row and at least one data row',
          variant: 'destructive'
        })
        return
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      
      // Map headers to our expected fields
      const headerMap: Record<string, string> = {
        'first name': 'first_name',
        'firstname': 'first_name',
        'first': 'first_name',
        'last name': 'last_name',
        'lastname': 'last_name',
        'last': 'last_name',
        'email': 'email',
        'phone': 'phone',
        'phone number': 'phone',
        'mobile': 'phone',
        'company': 'company',
        'organization': 'company',
        'position': 'position',
        'title': 'position',
        'job title': 'position',
        'address': 'street_address',
        'street': 'street_address',
        'street address': 'street_address',
        'city': 'city',
        'state': 'state',
        'zip': 'zip',
        'zipcode': 'zip',
        'zip code': 'zip',
        'postal code': 'zip',
        'notes': 'notes',
        'comments': 'notes'
      }

      const fieldIndices: Record<string, number> = {}
      headers.forEach((header, index) => {
        const mappedField = headerMap[header]
        if (mappedField) {
          fieldIndices[mappedField] = index
        }
      })

      // Check required fields
      if (fieldIndices.first_name === undefined || fieldIndices.email === undefined) {
        toast({
          title: 'Missing required columns',
          description: 'CSV must have "First Name" and "Email" columns',
          variant: 'destructive'
        })
        return
      }

      // Parse data rows
      const parsed: ParsedPerson[] = []
      const errors: ValidationError[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const rowErrors: string[] = []

        const person: ParsedPerson = {
          first_name: values[fieldIndices.first_name]?.trim() || '',
          last_name: values[fieldIndices.last_name]?.trim() || '',
          email: values[fieldIndices.email]?.trim() || '',
          phone: fieldIndices.phone !== undefined ? values[fieldIndices.phone]?.trim() : undefined,
          company: fieldIndices.company !== undefined ? values[fieldIndices.company]?.trim() : undefined,
          position: fieldIndices.position !== undefined ? values[fieldIndices.position]?.trim() : undefined,
          street_address: fieldIndices.street_address !== undefined ? values[fieldIndices.street_address]?.trim() : undefined,
          city: fieldIndices.city !== undefined ? values[fieldIndices.city]?.trim() : undefined,
          state: fieldIndices.state !== undefined ? values[fieldIndices.state]?.trim() : undefined,
          zip: fieldIndices.zip !== undefined ? values[fieldIndices.zip]?.trim() : undefined,
          notes: fieldIndices.notes !== undefined ? values[fieldIndices.notes]?.trim() : undefined
        }

        // Validate row
        if (!person.first_name) {
          rowErrors.push('First name is required')
        }
        if (!person.email) {
          rowErrors.push('Email is required')
        } else if (!isValidEmail(person.email)) {
          rowErrors.push('Invalid email format')
        }

        if (rowErrors.length > 0) {
          errors.push({ row: i + 1, errors: rowErrors })
        } else {
          parsed.push(person)
        }
      }

      setParsedData(parsed)
      setValidationErrors(errors)
    }

    reader.readAsText(file)
  }

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current)
    return values
  }

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleImport = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to import contacts',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadedCount(0)

    try {
      const totalToUpload = parsedData.length
      let successCount = 0
      const failedRows: number[] = []

      for (let i = 0; i < parsedData.length; i++) {
        const person = parsedData[i]
        
        try {
          await createPerson({
            ...person,
            email: [person.email],
            phone: person.phone ? [person.phone] : [],
            client_type: 'person', // Default to person, not lead
            assigned_to: user.id
          })
          
          successCount++
          setUploadedCount(successCount)
          setUploadProgress((successCount / totalToUpload) * 100)
        } catch (error) {
          console.error(`Failed to create person at row ${i + 2}:`, error)
          failedRows.push(i + 2)
        }
      }

      if (successCount === totalToUpload) {
        toast({
          title: 'Import successful',
          description: `Successfully imported ${successCount} contacts`,
        })
        router.push('/people')
      } else {
        toast({
          title: 'Import partially successful',
          description: `Imported ${successCount} out of ${totalToUpload} contacts. Failed rows: ${failedRows.join(', ')}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: 'Import failed',
        description: 'An error occurred during import',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/people')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import People from CSV</h1>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Upload CSV File</h2>
          
          <div className="space-y-4">
            <div>
              <Label>CSV Format Requirements</Label>
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your CSV must include at minimum: First Name and Email columns.
                  Optional columns: Last Name, Phone, Company, Position, Address, City, State, Zip, Notes
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <Label htmlFor="csv-file">Select CSV File</Label>
              <div className="mt-2 flex gap-4">
                <Input
                  ref={fileInputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
              {file && (
                <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </p>
              )}
            </div>
          </div>
        </Card>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Validation Errors:</p>
              <ul className="list-disc list-inside text-sm">
                {validationErrors.map((error) => (
                  <li key={error.row}>
                    Row {error.row}: {error.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Preview ({parsedData.length} valid records)
              </h2>
              <Button
                onClick={handleImport}
                disabled={isUploading || parsedData.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import {parsedData.length} Contacts
                  </>
                )}
              </Button>
            </div>

            {isUploading && (
              <div className="mb-4 space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Uploaded {uploadedCount} of {parsedData.length} contacts
                </p>
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((person, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {person.first_name} {person.last_name}
                      </TableCell>
                      <TableCell>{person.email}</TableCell>
                      <TableCell>{person.phone || '-'}</TableCell>
                      <TableCell>{person.company || '-'}</TableCell>
                      <TableCell>
                        {[person.city, person.state].filter(Boolean).join(', ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        ... and {parsedData.length - 10} more records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}