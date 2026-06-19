import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../design-system/primitives/Button/Button";

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  error: Error | null;
}

/** Keeps a broken tab from blanking the whole window. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(error, info.componentStack);
    }
    void window.tbh
      ?.logRendererError?.({
        source: "ErrorBoundary",
        message: error.message,
        stack: info.componentStack ?? error.stack,
      })
      .catch(() => {
        // Preload may be unavailable during early boot.
      });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-lg font-semibold">
            {this.props.title ?? "Something went wrong"}
          </h1>
          <p className="m-0 text-muted">{this.state.error.message}</p>
          <p className="m-0 text-muted">
            Quit and reopen the app (or restart <code>npm run dev</code> after pulling updates).
          </p>
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
