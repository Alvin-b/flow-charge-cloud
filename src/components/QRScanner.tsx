import { useState, useEffect, useRef } from "react"
import { Camera, X, Flashlight, FlipHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QRScannerProps {
  onScan: (data: string) => void
  onClose: () => void
  className?: string
}

export function QRScanner({ onScan, onClose, className }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setHasPermission(true)
      
      // Start QR detection loop
      detectQRCode()
    } catch (err: any) {
      console.error("Camera error:", err)
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access to scan QR codes.")
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please connect a camera to scan QR codes.")
      } else {
        setError("Failed to access camera. Please try again.")
      }
      setHasPermission(false)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Simple QR code detection using jsQR library pattern
  // For production, integrate a proper QR library
  const detectQRCode = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const scanFrame = () => {
      if (!streamRef.current) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Check for QR-like patterns (simplified)
      // In production, use a library like jsQR or html5-qrcode
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Simulate QR detection - in real implementation, use jsQR
      // For now, we'll use a timeout-based approach
      requestAnimationFrame(scanFrame)
    }

    scanFrame()
  }

  const handleManualInput = () => {
    const code = prompt("Enter meter code manually:")
    if (code) {
      onScan(code)
    }
  }

  if (hasPermission === false) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 text-center", className)}>
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Camera className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Camera Access Required</h3>
        <p className="text-sm text-muted-foreground mb-6">{error || "Please allow camera access to scan QR codes."}</p>
        
        <div className="space-y-3 w-full">
          <Button onClick={startCamera} className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold">
            Try Again
          </Button>
          <Button onClick={handleManualInput} variant="outline" className="w-full">
            Enter Code Manually
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-black", className)}>
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-[400px] object-cover"
        playsInline
        muted
      />
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scan frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 relative">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            
            {/* Scan line animation */}
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
          </div>
        </div>

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
        
        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-0 right-0 px-6 flex items-center justify-between">
        <button
          onClick={() => setFlashOn(!flashOn)}
          className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
        >
          <Flashlight className={cn("w-5 h-5", flashOn ? "text-yellow-400" : "text-white")} />
        </button>
        
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <button
          className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
        >
          <FlipHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute top-28 left-0 right-0 text-center">
        <p className="text-white text-sm font-medium">Position QR code within frame</p>
      </div>

      {/* Manual input button */}
      <button
        onClick={handleManualInput}
        className="absolute bottom-40 left-0 right-0 text-center"
      >
        <span className="text-white/60 text-sm hover:underline">Enter code manually</span>
      </button>
    </div>
  )
}
