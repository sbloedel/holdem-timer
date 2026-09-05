import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import {
  getAllBlindStructures,
  getSelectedStructureName,
  saveBlindStructure,
  setSelectedStructureName,
} from '../services/blindStructureStorage';
import type { BlindStructure } from '../models/BlindStructure';

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/" element={<div>Clock Screen</div>} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the seeded default structure', () => {
    renderSettings();

    expect(screen.getByText('Sample Home Game')).toBeInTheDocument();
  });

  it('creates a new blind structure with a level', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'New Blind Structure' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Turbo' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Fast blinds' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Turbo')).toBeInTheDocument();
    expect(getAllBlindStructures().some((s) => s.name === 'Turbo')).toBe(true);
  });

  it('rejects a duplicate name when creating a structure', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'New Blind Structure' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sample Home Game' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('A blind structure with this name already exists.')).toBeInTheDocument();
  });

  it('edits an existing structure and renames it', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed Game' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Renamed Game')).toBeInTheDocument();
    expect(screen.queryByText('Sample Home Game')).not.toBeInTheDocument();
  });

  it('adds and removes levels while editing', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));

    const initialLevelCount = screen.getAllByLabelText(/title$/i).length;
    fireEvent.click(screen.getByRole('button', { name: '+ Add Level' }));
    expect(screen.getAllByLabelText(/title$/i)).toHaveLength(initialLevelCount + 1);

    fireEvent.click(screen.getByRole('button', { name: `Remove level ${initialLevelCount + 1}` }));
    expect(screen.getAllByLabelText(/title$/i)).toHaveLength(initialLevelCount);
  });

  it('allows a numeric field to be fully cleared and retyped, including a leading zero', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));

    const smallBlindInput = screen.getByLabelText('Level 1 small blind') as HTMLInputElement;
    fireEvent.change(smallBlindInput, { target: { value: '' } });
    expect(smallBlindInput.value).toBe('');

    fireEvent.change(smallBlindInput, { target: { value: '15' } });
    expect(smallBlindInput.value).toBe('15');

    // Non-numeric characters typed on a full keyboard are stripped.
    fireEvent.change(smallBlindInput, { target: { value: '15a' } });
    expect(smallBlindInput.value).toBe('15');
  });

  it('selects a structure and navigates to the clock screen when its row is clicked', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: 'Another one',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /^Second Structure/ }));

    expect(getSelectedStructureName()).toBe('Second Structure');
    expect(screen.getByText('Clock Screen')).toBeInTheDocument();
  });

  it('shows which structure is currently selected in green', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: 'Another one',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    setSelectedStructureName('Second Structure');
    renderSettings();

    const item = screen.getByText('Second Structure').closest('li')!;
    expect(within(item).getByText('Selected')).toBeInTheDocument();
  });

  it('does not navigate when the Edit or Delete icons are clicked', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));

    expect(screen.queryByText('Clock Screen')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Blind Structure')).toBeInTheDocument();
  });

  it('prevents deleting the last remaining structure', () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Delete Sample Home Game' }));

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
    fireEvent.click(within(item).getByRole('button', { name: 'Delete Deletable' }));

    expect(screen.queryByText('Deletable')).not.toBeInTheDocument();
  });

  it('exports all blind structures as a single JSON file', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: '',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });

    const clickSpy = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);

    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
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

  it('reorders levels when the drag handle is dragged past another level', () => {
    // jsdom doesn't perform real layout, so give each row a distinct
    // vertical position (in DOM order) for the pointer-based reorder logic
    // to compare against.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const siblings = this.parentElement ? Array.from(this.parentElement.children) : [];
      const index = siblings.indexOf(this);
      const top = index * 40;
      return {
        top,
        bottom: top + 40,
        height: 40,
        width: 100,
        left: 0,
        right: 100,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    });

    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));

    expect(screen.getByLabelText('Level 1 title')).toHaveValue('Level 1');
    expect(screen.getByLabelText('Level 2 title')).toHaveValue('Level 2');

    const firstHandle = screen.getByLabelText('Reorder level 1');
    fireEvent.pointerDown(firstHandle, { clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(firstHandle, { clientY: 60 });
    fireEvent.pointerUp(firstHandle, { clientY: 60, pointerId: 1 });

    expect(screen.getByLabelText('Level 1 title')).toHaveValue('Level 2');
    expect(screen.getByLabelText('Level 2 title')).toHaveValue('Level 1');
  });
});
