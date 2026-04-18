import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  inline?: boolean; // if true, shows a smaller inline error instead of full screen
}
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const msg = this.props.fallbackMessage || this.state.error?.message || 'An unexpected error occurred.';

      // Inline variant — used to wrap individual components/pages
      if (this.props.inline) {
        return (
          <div className="flex flex-col items-center justify-center p-8 gap-4 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="w-10 h-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white mb-1">Something went wrong</p>
              <p className="text-xs text-slate-400">{msg}</p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <RefreshCcw size={12} /> Try Again
            </button>
          </div>
        );
      }

      // Full screen variant — top level
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={30} />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{msg}</p>
            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                <RefreshCcw size={16} /> Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-900 font-bold py-3 px-6 rounded-xl hover:bg-slate-100 transition-all">
                <Home size={16} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
