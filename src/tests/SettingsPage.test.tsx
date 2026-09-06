import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import {
  deleteBlindStructure,
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
    fireEvent.click(screen.getByRole('button', { name: 'Add Level' }));
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
    deleteBlindStructure('WSOP'); // leave only Sample Home Game so it's the last remaining structure
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

  it('auto-selects a numeric field\'s text on focus', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));

    const smallBlindInput = screen.getByLabelText('Level 1 small blind') as HTMLInputElement;
    const selectSpy = vi.spyOn(smallBlindInput, 'select');
    fireEvent.focus(smallBlindInput);

    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it('defaults a new level from the previous level (doubled blinds, same ante/minutes)', () => {
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));

    const lastIndex = screen.getAllByLabelText(/title$/i).length;
    const previousSmallBlind = (screen.getByLabelText(`Level ${lastIndex} small blind`) as HTMLInputElement).value;
    const previousBigBlind = (screen.getByLabelText(`Level ${lastIndex} big blind`) as HTMLInputElement).value;
    const previousAnte = (screen.getByLabelText(`Level ${lastIndex} ante`) as HTMLInputElement).value;
    const previousMinutes = (screen.getByLabelText(`Level ${lastIndex} minutes`) as HTMLInputElement).value;

    fireEvent.click(screen.getByRole('button', { name: 'Add Level' }));

    const newIndex = lastIndex + 1;
    expect(screen.getByLabelText(`Level ${newIndex} small blind`)).toHaveValue(
      String(Number(previousSmallBlind) * 2),
    );
    expect(screen.getByLabelText(`Level ${newIndex} big blind`)).toHaveValue(String(Number(previousBigBlind) * 2));
    expect(screen.getByLabelText(`Level ${newIndex} ante`)).toHaveValue(previousAnte);
    expect(screen.getByLabelText(`Level ${newIndex} minutes`)).toHaveValue(previousMinutes);
  });

  it('shows a Save/Discard/Cancel dialog when switching away from a dirty draft, and Cancel keeps editing', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: '',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sample Home Game Edited' } });

    const otherItem = screen.getByText('Second Structure').closest('li')!;
    fireEvent.click(within(otherItem).getByRole('button', { name: 'Edit Second Structure' }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('You have unsaved changes. Save before switching?')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Sample Home Game Edited');
  });

  it('discards changes and proceeds when Discard is chosen in the unsaved-changes dialog', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: '',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sample Home Game Edited' } });

    const otherItem = screen.getByText('Second Structure').closest('li')!;
    fireEvent.click(within(otherItem).getByRole('button', { name: 'Edit Second Structure' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Blind Structure')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Second Structure');
    expect(getAllBlindStructures().some((s) => s.name === 'Sample Home Game Edited')).toBe(false);
  });

  it('saves changes and proceeds when Save is chosen in the unsaved-changes dialog', () => {
    saveBlindStructure({
      name: 'Second Structure',
      description: '',
      levels: [{ title: 'Level 1', initialSeconds: 60, smallBlind: 1, bigBlind: 2 }],
    });
    renderSettings();

    const item = screen.getByText('Sample Home Game').closest('li')!;
    fireEvent.click(within(item).getByRole('button', { name: 'Edit Sample Home Game' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sample Home Game Edited' } });

    const otherItem = screen.getByText('Second Structure').closest('li')!;
    fireEvent.click(within(otherItem).getByRole('button', { name: 'Edit Second Structure' }));

    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(screen.queryByText('You have unsaved changes. Save before switching?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Second Structure');
    expect(getAllBlindStructures().some((s) => s.name === 'Sample Home Game Edited')).toBe(true);
  });
});
