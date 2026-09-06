import { beforeEach, describe, expect, it } from 'vitest';
import type { BlindStructure } from '../models/BlindStructure';
import {
  deleteBlindStructure,
  getAllBlindStructures,
  getBlindStructureByName,
  getSelectedBlindStructure,
  getSelectedStructureName,
  isBlindStructure,
  saveBlindStructure,
  setSelectedStructureName,
  structureNameExists,
} from '../services/blindStructureStorage';

function makeStructure(name: string): BlindStructure {
  return {
    name,
    description: `Description for ${name}`,
    levels: [{ title: 'Level 1', initialSeconds: 300, smallBlind: 10, bigBlind: 20, ante: 0 }],
  };
}

describe('blindStructureStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds the default sample structures on first read and keeps returning them', () => {
    const structures = getAllBlindStructures();

    expect(structures).toHaveLength(2);
    expect(structures[0].levels.length).toBeGreaterThan(0);
    expect(getAllBlindStructures()).toHaveLength(2);
  });

  it('saves a new structure and finds it by name', () => {
    saveBlindStructure(makeStructure('My Structure'));

    const found = getBlindStructureByName('My Structure');
    expect(found).toBeDefined();
    expect(found?.description).toBe('Description for My Structure');
    expect(getAllBlindStructures().some((s) => s.name === 'My Structure')).toBe(true);
  });

  it('detects name collisions, excluding the structure being edited', () => {
    saveBlindStructure(makeStructure('Alpha'));

    expect(structureNameExists('Alpha')).toBe(true);
    expect(structureNameExists('Alpha', 'Alpha')).toBe(false);
    expect(structureNameExists('Beta')).toBe(false);
  });

  it('renames a structure in place using previousName, without creating a duplicate', () => {
    saveBlindStructure(makeStructure('Old Name'));
    saveBlindStructure(makeStructure('New Name'), 'Old Name');

    const all = getAllBlindStructures();
    expect(all.some((s) => s.name === 'Old Name')).toBe(false);
    expect(all.some((s) => s.name === 'New Name')).toBe(true);
  });

  it('repoints the selected structure when the selected structure is renamed', () => {
    saveBlindStructure(makeStructure('Selectable'));
    setSelectedStructureName('Selectable');

    saveBlindStructure(makeStructure('Renamed'), 'Selectable');

    expect(getSelectedStructureName()).toBe('Renamed');
  });

  it('deletes a structure and repoints selection to the first remaining one', () => {
    saveBlindStructure(makeStructure('First'));
    saveBlindStructure(makeStructure('Second'));
    setSelectedStructureName('First');

    deleteBlindStructure('First');

    const remaining = getAllBlindStructures();
    expect(getBlindStructureByName('First')).toBeUndefined();
    expect(getSelectedStructureName()).toBe(remaining[0].name);
  });

  it('falls back to the first available structure when nothing is selected', () => {
    const structure = getSelectedBlindStructure();
    expect(structure).toEqual(getAllBlindStructures()[0]);
  });

  it('returns the selected structure when one has been chosen', () => {
    saveBlindStructure(makeStructure('Chosen'));
    setSelectedStructureName('Chosen');

    expect(getSelectedBlindStructure().name).toBe('Chosen');
  });

  describe('isBlindStructure', () => {
    it('accepts a well-formed structure', () => {
      expect(isBlindStructure(makeStructure('Valid'))).toBe(true);
    });

    it('rejects structures with no levels', () => {
      expect(isBlindStructure({ name: 'Empty', description: '', levels: [] })).toBe(false);
    });

    it('rejects malformed input', () => {
      expect(isBlindStructure(null)).toBe(false);
      expect(isBlindStructure('not an object')).toBe(false);
      expect(isBlindStructure({ name: 'Missing levels', description: '' })).toBe(false);
      expect(
        isBlindStructure({
          name: 'Bad level',
          description: '',
          levels: [{ title: 'Level 1', initialSeconds: 'not a number', smallBlind: 10, bigBlind: 20 }],
        }),
      ).toBe(false);
    });
  });
});
