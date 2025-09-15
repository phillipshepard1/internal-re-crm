"use client"

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DataTablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
  hasPreviousPage: boolean
  className?: string
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  className
}: DataTablePaginationProps) {
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4", className)}>
      <div className="text-sm text-muted-foreground text-center sm:text-left">
        <span className="hidden sm:inline">Showing {startIndex} to {endIndex} of {totalItems} results</span>
        <span className="sm:hidden">{startIndex}-{endIndex} of {totalItems}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronLeft className="h-4 w-4" />
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-9 w-9 sm:h-8 sm:w-8 p-0"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-1">
          {/* Mobile: Show only current page and total */}
          <div className="flex sm:hidden items-center gap-2 px-3">
            <span className="text-sm font-medium">{currentPage}</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{totalPages}</span>
          </div>
          {/* Desktop: Show page numbers */}
          <div className="hidden sm:flex items-center space-x-1">
            {visiblePages.map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="flex h-8 w-8 items-center justify-center text-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => onPageChange(page as number)}
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          className="h-9 w-9 sm:h-8 sm:w-8 p-0"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronRight className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 