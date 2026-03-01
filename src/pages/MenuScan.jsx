/**
 * MenuScan - Camera + laser animation + agent status.
 * Person 3 owns this. Feeds results to P4's MenuDisplay when done.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AgentStatusBar } from '../components/AgentStatusBar'
import { useStore } from '../store'
import { useAnalyzeStream } from '../hooks/useAnalyzeStream'

export function MenuScan({ restaurant, onDone, onBack }) {
  const [scanPhase, setScanPhase] = useState('idle') // idle | scanning | processing | done | error
  const [errorMessage, setErrorMessage] = useState(null)
  const [uploadMode, setUploadMode] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const { startAnalyze } = useAnalyzeStream()
  const { dishList, agentStatus, setDishList, setAgentStatus, resetScan } = useStore()

  const agentDoneCount = Object.values(agentStatus).filter((s) => s === 'done').length
  const dishCount = dishList.length
  const allAgentsDone = agentDoneCount === 4

  // Auto-transition to done/error when all agents complete
  useEffect(() => {
    if (scanPhase === 'processing' && allAgentsDone) {
      if (dishList.length === 0) {
        setErrorMessage('No menu items found. Please try a clearer photo.')
        setScanPhase('error')
      } else {
        setScanPhase('done')
      }
    }
  }, [scanPhase, allAgentsDone, dishList.length])

  const startCamera = useCallback(async () => {
    setErrorMessage(null)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      }
    } catch (err) {
      setErrorMessage('Camera access denied. Please use file upload instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const captureImage = useCallback(() => {
    if (!videoRef.current) return null
    
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)
    
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1] // Return base64 without prefix
  }, [])

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      await processScan(base64)
    }
    reader.readAsDataURL(file)
  }, [])

  const processScan = async (imageBase64) => {
    resetScan()
    setErrorMessage(null)
    setScanPhase('processing')

    try {
      await startAnalyze({
        restaurantId: restaurant.id,
        imageBase64: imageBase64,
        mock: false, // Use real scanning now
      })
      // State transition handled by useEffect watching allAgentsDone
    } catch (err) {
      console.error('Analyze failed:', err)
      setErrorMessage('Failed to scan menu. Please try again or use a different image.')
      setScanPhase('error')
    }
  }

  const startScan = async () => {
    await startCamera()
    setScanPhase('scanning')
    
    // Wait 2 seconds for camera to stabilize, then capture
    setTimeout(async () => {
      const imageBase64 = captureImage()
      stopCamera()
      
      if (imageBase64) {
        await processScan(imageBase64)
      } else {
        setErrorMessage('Failed to capture image. Please try again.')
        setScanPhase('error')
      }
    }, 2000)
  }

  const handleDone = () => {
    stopCamera()
    onDone()
  }

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 pt-12 px-5 pb-4">
        <button
          onClick={onBack}
          className="bg-transparent border-none text-muted text-2xl cursor-pointer p-0"
        >
          ‹
        </button>
        <div>
          <p className="text-[11px] text-muted font-ui tracking-wider uppercase">Scanning</p>
          <h2 className="font-display font-bold text-2xl text-cream">{restaurant.name}</h2>
        </div>
      </div>

      <div className="mx-5 flex-1 rounded-3xl overflow-hidden relative border border-dim bg-[#050403] min-h-[280px] max-h-[360px]">
        {/* Camera / placeholder */}
        {scanPhase !== 'idle' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ opacity: scanPhase === 'idle' ? 0.3 : 0.5, filter: 'brightness(0.4) blur(2px)' }}
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=50"
            alt="menu"
            className="w-full h-full object-cover"
            style={{ opacity: 0.3, filter: 'brightness(0.4) blur(2px)' }}
          />
        )}

        {/* Scan frame corners */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => {
          const isTop = pos.includes('top')
          const isLeft = pos.includes('left')
          return (
            <div
              key={pos}
              className="absolute w-7 h-7"
              style={{
                top: isTop ? 16 : undefined,
                bottom: !isTop ? 16 : undefined,
                left: isLeft ? 16 : undefined,
                right: !isLeft ? 16 : undefined,
                borderTop: isTop ? '2px solid #CF8008' : undefined,
                borderBottom: !isTop ? '2px solid #CF8008' : undefined,
                borderLeft: isLeft ? '2px solid #CF8008' : undefined,
                borderRight: !isLeft ? '2px solid #CF8008' : undefined,
                opacity: scanPhase !== 'idle' ? 1 : 0.5,
              }}
            />
          )
        })}

        {/* Laser line */}
        {(scanPhase === 'scanning' || scanPhase === 'processing') && (
          <div
            className="absolute left-4 right-4 h-0.5 z-10"
            style={{
              background: 'linear-gradient(90deg, transparent, #ff4444, #ff6666, #ff4444, transparent)',
              boxShadow: '0 0 12px rgba(255,80,80,.8), 0 0 24px rgba(255,80,80,.4)',
              animation: 'laser 1.8s ease-in-out infinite',
              top: 0,
            }}
          />
        )}

        {scanPhase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="text-4xl opacity-40">⌖</div>
            <p className="text-xs text-cream/30 font-ui tracking-wider">Point at any menu</p>
          </div>
        )}

        {scanPhase === 'error' && (
          <div className="absolute inset-0 bg-bg/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center px-4">
              <div className="text-5xl mb-3 opacity-60">😅</div>
              <p className="text-sm text-cream font-display font-semibold mb-1">Oopsie!</p>
              <p className="text-xs text-muted font-ui">{errorMessage}</p>
            </div>
          </div>
        )}

        {scanPhase === 'processing' && agentDoneCount === 0 && (
          <div className="absolute inset-0 bg-bg/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl animate-pulse mb-2">⌖</div>
              <p className="text-xs text-amber font-ui tracking-widest">Parsing menu...</p>
            </div>
          </div>
        )}

        {dishCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 bg-amber text-black rounded-full px-3 py-1 text-xs font-bold font-ui"
          >
            {dishCount} dishes found
          </motion.div>
        )}
      </div>

      <div className="p-4 px-5">
        <AgentStatusBar />
      </div>

      <div className="px-5 pb-8">
        {scanPhase === 'idle' ? (
          <div className="space-y-3">
            <button
              onClick={startScan}
              className="w-full py-4 bg-amber text-black border-none rounded-2xl font-ui font-bold text-sm tracking-wider uppercase cursor-pointer"
              style={{ animation: 'glow 2s ease-in-out infinite' }}
            >
              📸 Scan with Camera
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-transparent text-amber border-2 border-amber rounded-2xl font-ui font-bold text-sm tracking-wider uppercase cursor-pointer hover:bg-amber/10 transition-colors"
            >
              📁 Upload Menu Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : scanPhase === 'done' && dishCount > 0 ? (
          <button
            onClick={handleDone}
            className="w-full py-4 bg-amber text-black border-none rounded-2xl font-ui font-bold text-sm tracking-wider uppercase cursor-pointer"
            style={{ animation: 'glow 2s ease-in-out infinite' }}
          >
            View {dishCount} Dishes →
          </button>
        ) : scanPhase === 'error' ? (
          <div className="space-y-3">
            <button
              onClick={() => {
                setScanPhase('idle')
                setErrorMessage(null)
              }}
              className="w-full py-4 bg-amber text-black border-none rounded-2xl font-ui font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted font-ui tracking-wider">
              {agentDoneCount}/4 agents complete
            </p>
            <div className="mt-2 h-0.5 bg-dim rounded">
              <div
                className="h-full rounded bg-amber transition-all duration-300"
                style={{ width: `${(agentDoneCount / 4) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
