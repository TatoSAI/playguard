import { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface ScreenshotViewerProps {
  screenshots: string[]
  title?: string
  onClose?: () => void
  initialIndex?: number
}

export function ScreenshotViewer({ screenshots, title, onClose, initialIndex = 0 }: ScreenshotViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, currentIndex, screenshots.length])

  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No screenshots available
      </div>
    )
  }

  const currentScreenshot = screenshots[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0))
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = currentScreenshot
    link.download = `screenshot_${currentIndex + 1}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              title="Exit Fullscreen"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
              title="Close (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Help hint */}
          <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg">
            Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded">ESC</kbd> to close
          </div>

          {/* Navigation */}
          {screenshots.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={currentScreenshot}
            alt={`Screenshot ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {/* Counter */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg">
              {currentIndex + 1} / {screenshots.length}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card max-w-2xl">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{title || 'Screenshots'}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Press ESC or click outside to close
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="relative group">
        <img
          src={currentScreenshot}
          alt={`Screenshot ${currentIndex + 1}`}
          className="max-w-full max-h-[70vh] object-contain cursor-zoom-in mx-auto block"
          onClick={toggleFullscreen}
        />

        {/* Hover Controls */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            title="View Fullscreen"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {screenshots.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {screenshots.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === screenshots.length - 1}
                className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          Download
        </button>
      </div>
    </div>
  )
}

interface ScreenshotThumbnailProps {
  screenshot: string
  alt?: string
  onClick?: () => void
}

export function ScreenshotThumbnail({ screenshot, alt, onClick }: ScreenshotThumbnailProps) {
  if (!screenshot) return null

  return (
    <div
      className="relative group cursor-pointer border border-border rounded overflow-hidden bg-muted/30 hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <img
        src={screenshot}
        alt={alt || 'Screenshot'}
        className="w-full h-20 object-contain"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <ZoomIn className="w-5 h-5 text-white" />
      </div>
    </div>
  )
}
