import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TimerPage } from '../pages/TimerPage';

describe('TimerPage', () => {
  it('renders the default level with a 5 minute countdown and blinds, no ante', () => {
    render(
      <MemoryRouter>
        <TimerPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Level 1' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
    expect(screen.getByText('Small Blind').nextSibling).toHaveTextContent('20');
    expect(screen.getByText('Big Blind').nextSibling).toHaveTextContent('10');
    expect(screen.queryByText('Ante')).not.toBeInTheDocument();
  });
});
