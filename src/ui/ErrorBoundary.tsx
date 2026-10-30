// PRD §8: on a crash the child sees the mascot and one big home button, no error text.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n.ts';
import { IconButton } from './IconButton.tsx';
import { HomeIcon } from './Icons.tsx';
import { Mascot } from './Mascot.tsx';

interface Props {
  children: ReactNode;
  onHome(): void;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen screen--center">
        <Mascot mood="encouraging" />
        <IconButton
          label={t('nav.home')}
          variant="primary"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onHome();
          }}
        >
          <HomeIcon />
        </IconButton>
      </main>
    );
  }
}
