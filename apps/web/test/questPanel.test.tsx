import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { QuestView } from '@chemimon/shared';
import { QUEST_DONE_MS, QuestPanel } from '../src/quests/QuestPanel';

const q = (id: string, progress: number, goal = 1): QuestView =>
  ({ id, title: `T-${id}`, hint: `H-${id}`, progress, goal, done: progress >= goal });

function setup(quests: QuestView[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['quests'], { quests });
  render(<QueryClientProvider client={qc}><QuestPanel /></QueryClientProvider>);
  return qc;
}

afterEach(() => vi.useRealTimers());

it('lists the first 3 unfinished quests with hint and progress, and the done count', () => {
  setup([q('a', 1), q('b', 0), q('c', 2, 3), q('d', 0), q('e', 0)]);
  const panel = screen.getByRole('region', { name: 'Nhiệm vụ' });
  expect(within(panel).getByLabelText('Đã xong')).toHaveTextContent('1/5');
  expect(within(panel).queryByTestId('quest-a')).toBeNull();
  expect(['b', 'c', 'd'].map((id) => within(panel).getByTestId(`quest-${id}`))).toHaveLength(3);
  expect(within(panel).queryByTestId('quest-e')).toBeNull();
  // Only the next quest shows its hint.
  expect(screen.getByTestId('quest-b')).toHaveTextContent('H-b');
  expect(screen.getByTestId('quest-c')).not.toHaveTextContent('H-c');
  expect(screen.getByTestId('quest-c')).toHaveTextContent('2/3');
  expect(screen.getByRole('progressbar', { name: 'Tiến độ T-c' })).toHaveAttribute('aria-valuenow', '2');
});

it('collapses and expands', () => {
  setup([q('a', 0)]);
  const toggle = screen.getByRole('button', { name: /Nhiệm vụ/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(toggle);
  expect(screen.queryByTestId('quest-a')).toBeNull();
  fireEvent.click(toggle);
  expect(screen.getByTestId('quest-a')).toBeInTheDocument();
});

it('announces a quest that becomes done, then hides the line; not the ones done at first load', () => {
  vi.useFakeTimers();
  const qc = setup([q('a', 1), q('b', 0), q('c', 0)]);
  expect(screen.queryByRole('status')).toBeNull();
  // React Query batches observer updates on a 0 ms timer: flush it under fake timers.
  act(() => { qc.setQueryData(['quests'], { quests: [q('a', 1), q('b', 1), q('c', 0)] }); vi.advanceTimersByTime(0); });
  expect(screen.getByRole('status')).toHaveTextContent('Hoàn thành: T-b');
  expect(screen.queryByTestId('quest-b')).toBeNull();
  act(() => { vi.advanceTimersByTime(QUEST_DONE_MS + 10); });
  expect(screen.queryByRole('status')).toBeNull();
});

it('says so when every quest is done', () => {
  setup([q('a', 1), q('b', 1)]);
  expect(screen.getByText('Bạn đã xong mọi nhiệm vụ!')).toBeInTheDocument();
});
