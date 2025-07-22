import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
    console.error('Base64 decode error:', error)
    console.log('Base64 string length:', base64String.length)
    console.log('Base64 string sample:', base64String.substring(0, 100))
    throw new Error('Invalid base64 data format')
  }
}
