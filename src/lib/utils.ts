import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format phone number as user types (111-111-1111)
 * @param value - Raw phone number input
 * @returns Formatted phone number
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10)
  
  // Format as XXX-XXX-XXXX
  if (limitedDigits.length <= 3) {
    return limitedDigits
  } else if (limitedDigits.length <= 6) {
    return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`
  } else {
    return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
  }
}

/**
 * Remove formatting from phone number for storage
 * @param value - Formatted phone number
 * @returns Raw digits only
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Format phone number for display (111-111-1111)
 * @param value - Raw phone number digits
 * @returns Formatted phone number for display
 */
export function formatPhoneNumberForDisplay(value: string): string {
  if (!value) return ''
  
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')
  
  // Format as XXX-XXX-XXXX
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  } else if (digits.length === 3) {
    return digits
  }
  
  // Return as-is if not a standard length
  return value
}

// Utility function to add timeout to any promise
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    })
  ])
}

// Utility function to retry failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }
  
  throw lastError!
}

// Utility function to safely decode base64 data from Gmail API
export function decodeBase64Safely(base64String: string): Uint8Array {
  try {
    // Handle URL-safe base64 and padding issues
    let normalizedBase64 = base64String
    
    // Replace URL-safe characters
    normalizedBase64 = normalizedBase64.replace(/-/g, '+').replace(/_/g, '/')
    
    // Add padding if needed
    while (normalizedBase64.length % 4) {
      normalizedBase64 += '='
    }
    
    // Decode base64 to binary string
    const binaryString = atob(normalizedBase64)
    
    // Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return bytes
  } catch (error) {
    throw new Error('Invalid base64 data format')
  }
}

/**
 * Safely extract email domain from an email address
 * @param email - Email address (can be null/undefined)
 * @returns Domain part of email or null if invalid
 */
export function getEmailDomain(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null
  
  const atIndex = email.indexOf('@')
  if (atIndex === -1 || atIndex === email.length - 1) return null
  
  return email.substring(atIndex + 1)
}

/**
 * Safely extract username from an email address
 * @param email - Email address (can be null/undefined)
 * @returns Username part of email or null if invalid
 */
export function getEmailUsername(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null
  
  const atIndex = email.indexOf('@')
  if (atIndex === -1 || atIndex === 0) return null
  
  return email.substring(0, atIndex)
}

/**
 * Validate if a string is a valid email address
 * @param email - String to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Safely split a name into first and last name parts
 * @param name - Full name string (can be null/undefined)
 * @returns Object with firstName and lastName
 */
export function splitFullName(name: string | null | undefined): { firstName: string; lastName: string } {
  if (!name || typeof name !== 'string') {
    return { firstName: '', lastName: '' }
  }
  
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { firstName: '', lastName: '' }
  }
  
  const parts = trimmedName.split(/\s+/)
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  
  return { firstName, lastName }
}

/**
 * Get display name from user object, with fallback to email username
 * @param user - User object with email and optional name fields
 * @returns Display name string
 */
export function getUserDisplayName(user: { 
  email?: string | null; 
  first_name?: string | null; 
  last_name?: string | null 
} | null | undefined): string {
  if (!user) return 'Unknown'
  
  // Try full name first
  if (user.first_name || user.last_name) {
    const parts = [user.first_name, user.last_name].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
  }
  
  // Fall back to email username
  const username = getEmailUsername(user.email)
  return username || 'Unknown'
}

/**
 * Validate environment variables at runtime
 * @param variables - Object with variable names as keys
 * @returns Object with validated variables
 */
export function validateEnvVars<T extends Record<string, string | undefined>>(
  variables: T
): { [K in keyof T]: string } {
  const validated: any = {}
  const missing: string[] = []
  
  for (const [key, value] of Object.entries(variables)) {
    if (!value) {
      missing.push(key)
    } else {
      validated[key] = value
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  return validated
}
