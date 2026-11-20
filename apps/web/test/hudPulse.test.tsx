import { act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HUD_PULSE_MS, useUi } from '../src/state/ui';

afterEach(() => vi.useRealTimers());

it('pulseHud lights one HUD widget for HUD_PULSE_MS, and a second click restarts the timer', () => {
  vi.useFakeTimers();
  expect(HUD_PULSE_MS).toBe(1500);
  act(() => useUi.getState().pulseHud('breeding'));
  expect(useUi.getState().pulse).toBe('breeding');
  vi.advanceTimersByTime(1000);
  act(() => useUi.getState().pulseHud('extractor'));
  vi.advanceTimersByTime(1000);
  expect(useUi.getState().pulse).toBe('extractor');
  vi.advanceTimersByTime(600);
  expect(useUi.getState().pulse).toBeNull();
});

it('the pulsing widget (and only that one) is marked and highlighted', async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { render, screen } = await import('@testing-library/react');
  const { BreedingPanel } = await import('../src/breeding/BreedingPanel');
  const { ExtractorButton } = await import('../src/extractor/ExtractorButton');
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  act(() => useUi.setState({ pulse: 'extractor' }));
  render(<QueryClientProvider client={qc}><BreedingPanel /><ExtractorButton /></QueryClientProvider>);
  expect(screen.getByTestId('extractor')).toHaveAttribute('data-pulse', 'true');
  expect(screen.getByTestId('extractor').className).toContain('animate-pulse');
  expect(screen.getByRole('region', { name: 'Lai tạo' })).not.toHaveAttribute('data-pulse');
  act(() => useUi.setState({ pulse: 'breeding' }));
  expect(screen.getByRole('region', { name: 'Lai tạo' })).toHaveAttribute('data-pulse', 'true');
  expect(screen.getByTestId('extractor')).not.toHaveAttribute('data-pulse');
});
