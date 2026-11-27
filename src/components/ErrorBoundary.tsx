import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuotaError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    let isQuotaError = false;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        if (parsed.error.toLowerCase().includes('quota exceeded')) {
          isQuotaError = true;
          readable = 'Firestore daily free-tier quota has been reached. Quota resets tomorrow or can be upgraded in Firebase Console.';
        } else if (parsed.error.toLowerCase().includes('permission')) {
          readable = `Access restricted for ${parsed.operationType || 'operation'} on ${parsed.path || 'resource'}. Ensure your email is verified and your account role has permission.`;
        } else {
          readable = parsed.error;
        }
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable, isQuotaError };
  }

  componentDidCatch(error: Error) {
    console.error('AgriSphere ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E2E5DF] rounded-xl p-8">
            <div className="flex items-center gap-3 text-[#991B1B] mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold">Application Notice</h2>
            </div>
            <p className="text-sm text-[#525B56] leading-relaxed mb-6">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '', isQuotaError: false });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#143325] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
