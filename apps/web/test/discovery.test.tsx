import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }: { children: unknown }) => <div>{children as never}</div> }));
vi.mock('../src/monsters/MonsterModel', () => ({ MonsterModel: () => null }));
import { DiscoveryOverlay } from '../src/breeding/DiscoveryOverlay';

it('shows the first-discovery badge only for listed ids', () => {
  const qc = new QueryClient();
  const m = (c: string) => ({ id: c, chemicalId: c, displayName: c, silhouette: 'orb', color: '#112233', assetKey: c, rarity: 'common', blurb: '' });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'h2o', formula: 'H2O' }, { id: 'co2', formula: 'CO2' }], monsters: [m('h2o'), m('co2')] });
  render(<QueryClientProvider client={qc}><DiscoveryOverlay onClose={() => {}} result={{
    products: [{ chemicalId: 'h2o', count: 1 }, { chemicalId: 'co2', count: 1 }], newDiscoveries: ['h2o', 'co2'], firstDiscoveries: ['h2o'] }} /></QueryClientProvider>);
  const [a, b] = screen.getAllByTestId('product');
  expect(within(a!).getByText('Khám phá mới!')).toBeInTheDocument();
  expect(within(a!).getByText('Người khám phá đầu tiên!')).toBeInTheDocument();
  expect(within(b!).queryByText('Người khám phá đầu tiên!')).toBeNull();
});

it('a new element product (fe from fe2o3) gets the new badge but no first-discovery badge', () => {
  const qc = new QueryClient();
  const m = (c: string) => ({ id: c, chemicalId: c, displayName: `M-${c}`, silhouette: 'orb', color: '#112233', assetKey: c, rarity: 'common', blurb: '' });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'fe', formula: 'Fe', kind: 'element' }, { id: 'h2o', formula: 'H2O' }], monsters: [m('fe'), m('h2o')] });
  render(<QueryClientProvider client={qc}><DiscoveryOverlay onClose={() => {}} result={{
    products: [{ chemicalId: 'fe', count: 2 }, { chemicalId: 'h2o', count: 3 }], newDiscoveries: ['fe', 'h2o'], firstDiscoveries: ['h2o'] }} /></QueryClientProvider>);
  const [fe, h2o] = screen.getAllByTestId('product');
  expect(fe).toHaveTextContent('M-fe ×2');
  expect(within(fe!).getByText('Khám phá mới!')).toBeInTheDocument();
  expect(within(fe!).queryByText('Người khám phá đầu tiên!')).toBeNull();
  expect(within(h2o!).getByText('Người khám phá đầu tiên!')).toBeInTheDocument();
});
