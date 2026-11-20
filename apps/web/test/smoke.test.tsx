import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../src/App';

it('smoke: renders CHEMIMON', () => {
  render(<App />);
  expect(screen.getByText('CHEMIMON')).toBeTruthy();
});
