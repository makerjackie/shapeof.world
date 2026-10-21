import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

type ElementRecord = {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: string;
  uncertainty?: string;
  massKind: 'standard' | 'isotope';
  group?: number;
  period: number;
  series?: '镧系' | '锕系';
  layoutColumn: number;
  layoutRow: number;
};

const root = process.cwd();
const data = JSON.parse(
  readFileSync(resolve(root, 'vendor/three-periodic-table/element-data.json'), 'utf8'),
) as {
  sources: Record<string, string>;
  elements: ElementRecord[];
};
const bySymbol = new Map(data.elements.map((element) => [element.symbol, element]));

describe('periodic table scientific data', () => {
  it('contains one ordered record for every known element', () => {
    expect(data.elements).toHaveLength(118);
    expect(data.elements.map(({atomicNumber}) => atomicNumber)).toEqual(
      Array.from({length: 118}, (_, index) => index + 1),
    );
    expect(new Set(data.elements.map(({symbol}) => symbol)).size).toBe(118);
    expect(new Set(data.elements.map(({name}) => name)).size).toBe(118);
  });

  it('separates standard atomic weights from representative isotope mass numbers', () => {
    for (const element of data.elements) {
      if (element.massKind === 'standard') {
        expect(element.atomicMass, element.symbol).not.toMatch(/[\[\]]/);
        expect(element.uncertainty, element.symbol).toMatch(/^\d/);
      } else {
        expect(element.atomicMass, element.symbol).toMatch(/^\[\d+\]$/);
        expect(element.uncertainty, element.symbol).toBeUndefined();
      }
    }
  });

  it('keeps corrected reference values and scientific positions', () => {
    expect(bySymbol.get('K')?.atomicMass).toBe('39.098');
    expect(bySymbol.get('Ba')?.atomicMass).toBe('137.33');
    expect(bySymbol.get('La')).toMatchObject({period: 6, series: '镧系'});
    expect(bySymbol.get('Ac')).toMatchObject({period: 7, series: '锕系'});
    expect(bySymbol.get('Es')?.name).toBe('Einsteinium');
    expect(bySymbol.get('Ds')?.name).toBe('Darmstadtium');
  });

  it('records the authoritative source and renders from the curated dataset', () => {
    expect(data.sources.standardWeights).toBe('https://ciaaw.org/abridged-atomic-weights.htm');
    expect(data.sources.standardWeightsEdition).toContain('2024');

    const source = readFileSync(resolve(root, 'vendor/three-periodic-table/index.html'), 'utf8');
    expect(source).toContain("import elementData from './element-data.json'");
    expect(source).toContain('element.atomicMass');
    expect(source).toContain('CIAAW 2024');
    expect(source).toContain('方括号表示代表性同位素质量数');
    expect(source).not.toContain("'K', 'Potassium', '39.948'");
    expect(source).not.toContain("'Ba', 'Barium', '132.9054'");

    const integration = readFileSync(resolve(root, 'src/components/experiences/worlds/periodic-table/PeriodicTable.tsx'), 'utf8');
    expect(integration).toContain("from './element-model'");
    const model = readFileSync(resolve(root, 'src/components/experiences/worlds/periodic-table/element-model.ts'), 'utf8');
    expect(model).toContain('./element-reference.json');
    const reference = JSON.parse(readFileSync(resolve(root, 'src/components/experiences/worlds/periodic-table/element-reference.json'), 'utf8'));
    expect(reference).toEqual(data);
  });
});
