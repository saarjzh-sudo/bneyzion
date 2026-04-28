import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background px-4"
        dir="rtl"
      >
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-3xl font-heading">משהו השתבש</h1>
          <p className="text-muted-foreground">
            נתקלנו בשגיאה לא צפויה. נסו לרענן את הדף — אם הבעיה ממשיכה, צרו איתנו קשר.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              רענון הדף
            </button>
            <a
              href="/"
              className="px-5 py-2 rounded-lg border border-border hover:bg-muted transition"
            >
              חזרה לבית
            </a>
          </div>
        </div>
      </div>
    );
  }
}
