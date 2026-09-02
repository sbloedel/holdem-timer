import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TimerPage } from '../pages/TimerPage';

describe('TimerPage', () => {
  it('renders the countdown starting at 20:00:00', () => {
    render(
      <MemoryRouter>
        <TimerPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('timer')).toHaveTextContent('00:20:00');
  });
});
