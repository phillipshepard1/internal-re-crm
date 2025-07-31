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
