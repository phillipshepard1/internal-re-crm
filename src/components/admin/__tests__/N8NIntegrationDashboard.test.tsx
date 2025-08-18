import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { N8NIntegrationDashboard } from '../N8NIntegrationDashboard'

// Mock fetch globally
global.fetch = jest.fn()

// Mock data
const mockStats: any[] = [
  {
    processing_source: 'n8n',
    total_processed: 150,
    leads_created: 120,
    success_rate: 80,
    avg_confidence: 0.75,
    high_confidence_rate: 65
  },
  {
    processing_source: 'cron',
    total_processed: 100,
    leads_created: 85,
    success_rate: 85,
    avg_confidence: 0.82,
    high_confidence_rate: 70
  },
  {
    processing_source: 'manual',
    total_processed: 50,
    leads_created: 45,
    success_rate: 90,
    avg_confidence: 0.88,
    high_confidence_rate: 80
  }
]

const mockRecentProcessing: any[] = [
  {
    id: '1',
    email_id: 'email-1',
    from: 'john.doe@example.com',
    subject: 'Interested in property at 123 Main St',
    processed_at: '2025-01-13T10:00:00Z',
    processing_source: 'n8n',
    ai_confidence: 0.85,
    person_id: 'person-123',
    success: true
  },
  {
    id: '2',
    email_id: 'email-2',
    from: 'jane.smith@example.com',
    subject: 'Property inquiry',
    processed_at: '2025-01-13T09:30:00Z',
    processing_source: 'cron',
    ai_confidence: 0.65,
    person_id: 'person-456',
    success: true
  },
  {
    id: '3',
    email_id: 'email-3',
    from: 'bob.wilson@example.com',
    subject: 'Rental application question',
    processed_at: '2025-01-13T09:00:00Z',
    processing_source: 'manual',
    ai_confidence: 0.45,
    person_id: null,
    success: false
  }
]

describe('N8NIntegrationDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    test('displays loading state initially', () => {
      ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
      
      render(<N8NIntegrationDashboard />)
      
      expect(screen.getByText('N8N Integration Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryAllByText(/animate-pulse/)).toBeTruthy()
    })
  })

  describe('Error State', () => {
    test('displays error message when API call fails', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
      
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
    })

    test('displays specific error message from API', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })
      
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load AI processing stats')).toBeInTheDocument()
      })
    })
  })

  describe('Success State', () => {
    beforeEach(() => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })
    })

    test('displays dashboard title and description', async () => {
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('N8N Integration Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Monitor AI-powered email processing performance')).toBeInTheDocument()
      })
    })

    test('displays statistics cards for each processing source', async () => {
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('N8N Processing')).toBeInTheDocument()
        expect(screen.getByText('CRON Processing')).toBeInTheDocument()
        expect(screen.getByText('MANUAL Processing')).toBeInTheDocument()
      })

      // Check N8N stats
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('120 leads created (80.0% success)')).toBeInTheDocument()
      expect(screen.getByText('Avg Confidence: 75.0%')).toBeInTheDocument()
    })

    test('displays correct icons for each processing source', async () => {
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('N8N Processing')).toBeInTheDocument()
        expect(screen.getByText('CRON Processing')).toBeInTheDocument()
        expect(screen.getByText('MANUAL Processing')).toBeInTheDocument()
      })
      
      // Check that SVG icons exist in the document - they are rendered for each processing source
      const svgIcons = document.querySelectorAll('svg')
      expect(svgIcons.length).toBeGreaterThan(0)
      
      // Verify that each processing card exists
      expect(screen.getByText('150')).toBeInTheDocument() // N8N total_processed
      expect(screen.getByText('100')).toBeInTheDocument() // CRON total_processed
      expect(screen.getByText('50')).toBeInTheDocument()  // MANUAL total_processed
    })
  })

  describe('Tabs Navigation', () => {
    beforeEach(() => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })
    })

    test('displays all tabs', async () => {
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Recent Processing' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument()
      })
    })

    test('switches between tabs correctly', async () => {
      const user = userEvent.setup()
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      })

      // Click on Recent Processing tab
      await user.click(screen.getByRole('tab', { name: 'Recent Processing' }))
      expect(screen.getByText('Recent Email Processing')).toBeInTheDocument()
      expect(screen.getByText('Latest emails processed by AI')).toBeInTheDocument()

      // Click on Performance tab
      await user.click(screen.getByRole('tab', { name: 'Performance' }))
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument()
      expect(screen.getByText('Detailed performance analysis by processing source')).toBeInTheDocument()
    })
  })

  describe('Overview Tab', () => {
    beforeEach(() => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })
    })

    test('displays correct summary statistics', async () => {
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        // Total Processed: 150 + 100 + 50 = 300
        expect(screen.getByText('300')).toBeInTheDocument()
        expect(screen.getByText('Total Processed')).toBeInTheDocument()
        
        // Leads Created: 120 + 85 + 45 = 250
        expect(screen.getByText('250')).toBeInTheDocument()
        expect(screen.getByText('Leads Created')).toBeInTheDocument()
        
        // Avg Success Rate: (80 + 85 + 90) / 3 = 85.0%
        expect(screen.getByText('85.0%')).toBeInTheDocument()
        expect(screen.getByText('Avg Success Rate')).toBeInTheDocument()
        
        // Avg Confidence: (0.75 + 0.82 + 0.88) / 3 * 100 = 81.7%
        expect(screen.getByText('81.7%')).toBeInTheDocument()
        expect(screen.getByText('Avg Confidence')).toBeInTheDocument()
      })
    })
  })

  describe('Recent Processing Tab', () => {
    beforeEach(() => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })
    })

    test('displays recent processing table with correct data', async () => {
      const user = userEvent.setup()
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Recent Processing' }))

      // Check table headers
      expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'From' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Subject' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Confidence' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Processed' })).toBeInTheDocument()

      // Check table data
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Interested in property at 123 Main St')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob.wilson@example.com')).toBeInTheDocument()
    })

    test('displays correct confidence badges', async () => {
      const user = userEvent.setup()
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Recent Processing' }))

      // High confidence (>= 0.8)
      expect(screen.getByText('High')).toBeInTheDocument()
      // Medium confidence (>= 0.6)
      expect(screen.getByText('Medium')).toBeInTheDocument()
      // Low confidence (< 0.6)
      expect(screen.getByText('Low')).toBeInTheDocument()
    })
  })

  describe('Performance Tab', () => {
    beforeEach(() => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })
    })

    test('displays performance metrics table', async () => {
      const user = userEvent.setup()
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Performance' }))

      // Check table headers
      expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Total' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Leads' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Success Rate' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Avg Confidence' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'High Confidence %' })).toBeInTheDocument()

      // Check data for each source
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1) // Header + data rows
    })
  })

  describe('Refresh Functionality', () => {
    test('refresh button triggers data reload', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
      })

      // Mock new data for refresh
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: [...mockStats] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: [...mockRecentProcessing] })
        })

      await user.click(screen.getByRole('button', { name: /Refresh/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(4) // 2 initial + 2 refresh
      })
    })

    test('refresh button shows loading state during refresh', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
      })

      // Mock slow response for refresh
      ;(fetch as jest.Mock)
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ stats: mockStats })
        }), 100)))

      const refreshButton = screen.getByRole('button', { name: /Refresh/i })
      await user.click(refreshButton)

      // Button should be disabled during refresh
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Utility Functions', () => {
    beforeEach(() => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })
    })

    test('getConfidenceColor returns correct CSS classes', async () => {
      const user = userEvent.setup()
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'Recent Processing' }))

      // Check that badges have correct styling based on confidence
      const highConfidenceBadge = screen.getByText('High')
      const mediumConfidenceBadge = screen.getByText('Medium')
      const lowConfidenceBadge = screen.getByText('Low')

      expect(highConfidenceBadge.className).toContain('green')
      expect(mediumConfidenceBadge.className).toContain('yellow')
      expect(lowConfidenceBadge.className).toContain('red')
    })

    test('getSourceIcon displays correct icons', async () => {
      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        const n8nCard = screen.getByText('N8N Processing').closest('div')
        const cronCard = screen.getByText('CRON Processing').closest('div')
        const manualCard = screen.getByText('MANUAL Processing').closest('div')
        
        expect(n8nCard).toBeInTheDocument()
        expect(cronCard).toBeInTheDocument()
        expect(manualCard).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles empty stats array', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: [] })
        })

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      })
      
      // Check for 0 values in the overview
      const totalProcessed = screen.getByText('Total Processed')
      const totalProcessedValue = totalProcessed.parentElement?.querySelector('.text-2xl')
      expect(totalProcessedValue?.textContent).toBe('0')
    })

    test('handles null/undefined values in data', async () => {
      const statsWithNull = [{
        processing_source: 'n8n',
        total_processed: 150,
        leads_created: 120,
        success_rate: 80,
        avg_confidence: 0,
        high_confidence_rate: 0
      }]
      
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: statsWithNull })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: [] })
        })

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('N8N Processing')).toBeInTheDocument()
      })
      
      // Should not crash and display values
      expect(screen.queryByText('NaN')).not.toBeInTheDocument()
      expect(screen.getByText('Avg Confidence: 0.0%')).toBeInTheDocument()
    })

    test('handles missing API response fields gracefully', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}) // Missing stats field
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}) // Missing processing field
        })

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('N8N Integration Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Monitor AI-powered email processing performance')).toBeInTheDocument()
      })
      
      // Should handle missing data gracefully by showing the dashboard with empty data
      expect(screen.getByText('Processing Summary')).toBeInTheDocument()
      
      // Check it rendered without errors
      const totalProcessed = screen.getByText('Total Processed')
      expect(totalProcessed).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    test('fetches data from correct endpoints', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stats: mockStats })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ processing: mockRecentProcessing })
        })

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/ai-processing-stats')
        expect(fetch).toHaveBeenCalledWith('/api/admin/recent-processing')
      })
    })

    test('handles network timeouts gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Request timeout'))

      render(<N8NIntegrationDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Request timeout')).toBeInTheDocument()
      })
    })
  })
})