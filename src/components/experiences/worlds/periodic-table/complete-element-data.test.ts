import {describe, expect, it} from 'vitest';

import {elements} from './element-model';
import {completeElementData, completeElementDataSource} from './complete-element-data';

describe('complete periodic-table data', () => {
  it('covers all 118 elements and conserves neutral shell counts', () => {
    expect(Object.keys(completeElementData)).toHaveLength(118);
    for (const element of elements) {
      const data = completeElementData[element.symbol];
      expect(data, element.symbol).toBeDefined();
      expect(data.shells, element.symbol).not.toBeNull();
      expect(data.shells?.reduce((sum, count) => sum + count, 0), element.symbol).toBe(
        element.atomicNumber,
      );
    }
  });

  it('retains source nulls and marks predicted superheavy configurations', () => {
    expect(completeElementData.He.electronegativity).toBeNull();
    expect(completeElementData.H.atomicRadius).toBe(120);
    expect(completeElementData.H.ionization).toBe(13.598);
    expect(completeElementData.C.note).toContain('sublimates');
    expect(completeElementData.He.note).toContain('ordinary pressure');
    expect(completeElementData.As.boil).toBeNull();
    expect(completeElementData.As.note).toContain('28 atm');
    expect(completeElementData.Rf.melt).toBeNull();
    expect(completeElementData.Mt.configPredicted).toBe(true);
    expect(completeElementData.Lr.config).toBe('[Rn]7s2 5f14 7p1');
    expect(completeElementData.Lr.configPredicted).toBe(true);
    expect(completeElementData.Lr.note).toContain('PubChem snapshot');
    expect(completeElementData.Og.configPredicted).toBe(true);
    expect(completeElementData.Og.melt).toBeNull();
    expect(completeElementData.Og.boil).toBeNull();
  });

  it('exposes a dated, hashed source snapshot', () => {
    expect(completeElementDataSource.sourceUrl).toBe(
      'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON',
    );
    expect(completeElementDataSource.retrievedOn).toMatch(/^2026-09-10$/);
    expect(completeElementDataSource.sourceUnits.atomicRadius).toContain('pm');
    expect(completeElementDataSource.sourceUnits.ionization).toBe('eV');
    expect(completeElementDataSource.sourceHashSha256).toBe(
      'ff0f75976583b8a6493b18d0b42e83e1b68bd6e112b45d33578d98494ed5d321',
    );
  });
});
