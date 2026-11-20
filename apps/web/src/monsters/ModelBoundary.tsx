import { Component, type ReactNode } from 'react';

/** Renders `fallback` when a model file fails to load or parse (missing file, broken .glb). */
export class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* fall back; nothing else to do */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
