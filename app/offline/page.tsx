export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md w-full">
        {/* Animated brain icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-purple-600/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gray-800 border border-purple-600/50 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-purple-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          No internet connection detected. Connect to the internet to continue
          learning with AI Learning Assistant.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
