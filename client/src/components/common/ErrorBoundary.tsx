import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-red-500/40 bg-red-950/30 min-h-[220px] font-cairo">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400 shadow-danger-glow">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-black text-red-200 mb-2">
            {this.props.fallbackTitle ?? 'حدث خطأ غير متوقع'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed font-mono">
            {this.state.error?.message || 'تعذر تحميل الواجهة بشكل سليم، يمكنك إعادة المحاولة.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-bold transition-all shadow-lg active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة التحميل والمحاولة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
