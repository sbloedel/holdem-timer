import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { getAllBlindStructures, getSelectedStructureName, saveBlindStructure } from '../services/blindStructureStorage';
import type { BlindStructure } from '../models/BlindStructure';

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists the seeded default structure', () => {
    renderSettings();

    expect(screen.getByText('Sample Home Game')).toBeInTheDocument();
  });

  it('creates a new blind structure with a level', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '+ New Blind Structure' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Turbo' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Fast blinds' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Turbo')).toBeInTheDocument();
    expect(getAllBlindStructures().some((s) => s.name === 'Turbo')).toBe(true);
  });

  it('rejects a duplicate name when creating a structure', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '+ New Blind Structure' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sample Home Game' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('A blind structure with this name already exists.')).toBeInTheDocument();
  });

  it('edits an existing structure and renames it', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed Game' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Renamed Game')).toBeInTheDocument();
    expect(screen.queryByText('Sample Home Game')).not.toBeInTheDocument();
  });

  it('adds and removes levels while editing', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit' }));

    const initialLevelCount = screen.getAllByLabelText(/title$/i).length;
    fireEvent.click(screen.getByRole('button', { name: '+ Add Level' }));
    expect(screen.getAllByLabelText(/title$/i)).toHaveLength(initialLevelCount + 1);

    fireEvent.click(screen.getByRole('button', { name: `Remove level ${initialLevelCount + 1}` }));
    expect(screen.getAllByLabelText(/title$/i)).toHaveLength(initialLevelCount);
  });

  it('marks a structure as selected when "Use on Clock" is pressed', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: 'Another one',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    renderSettings();

    const item = screen.getByText('Second Structure').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Use on Clock' }));

    expect(getSelectedStructureName()).toBe('Second Structure');
    expect(within(item).getByText('Selected')).toBeInTheDocument();
  });

  it('prevents deleting the last remaining structure', () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Delete' }));

    expect(window.alert).toHaveBeenCalledWith('You must keep at least one blind structure.');
    expect(screen.getByText('Sample Home Game')).toBeInTheDocument();
  });

  it('deletes a structure after confirming when more than one exists', () => {
    saveBlindStructure({
      name: 'Deletable',
      description: '',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSettings();

    const item = screen.getByText('Deletable').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('Deletable')).not.toBeInTheDocument();
  });

  it('imports a structure from a JSON file, prompting to overwrite an existing name', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderSettings();

    const importedStructure: BlindStructure = {
      name: 'Sample Home Game',
      description: 'Overwritten description',
      levels: [{ title: 'Level 1', initialSeconds: 120, smallBlind: 5, bigBlind: 10 }],
    };
    const file = new File([JSON.stringify(importedStructure)], 'structures.json', { type: 'application/json' });

    const input = screen.getByLabelText('Import blind structures from JSON') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'A blind structure named "Sample Home Game" already exists. Overwrite it?',
      );
    });
    await vi.waitFor(() => {
      expect(getAllBlindStructures().find((s) => s.name === 'Sample Home Game')?.description).toBe(
        'Overwritten description',
      );
    });
  });
});
