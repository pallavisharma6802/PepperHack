/**
 * ErrorState — friendly error UI with retry button.
 * P4 owns this.
 */
export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4 py-16">
      <span className="text-5xl">😕</span>
      <h2 className="font-display font-bold text-2xl text-cream">Oops</h2>
      <p className="text-sm text-muted font-ui leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-8 py-3 rounded-full bg-amber text-black font-ui font-bold text-sm tracking-wider uppercase cursor-pointer"
          style={{ animation: 'glow 2s ease-in-out infinite' }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}
