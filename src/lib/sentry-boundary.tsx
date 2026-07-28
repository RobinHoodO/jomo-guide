import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    void import('./sentry').then(({ captureError }) => captureError(error));
  }

  render() {
    if (this.state.hasError) return <p style={{ padding: 24 }}>Something broke — reload to try again.</p>;
    return this.props.children;
  }
}
