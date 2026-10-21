import snapshot from './complete-element-data.json';

export interface CompleteElementData {
  config: string | null;
  shells: number[] | null;
  melt: number | null;
  boil: number | null;
  density: number | null;
  electronegativity: number | null;
  /** PubChem van der Waals radius, in pm. */
  atomicRadius?: number | null;
  /** First ionization energy, in eV. */
  ionization?: number | null;
  oxidation: string | null;
  discovery: string | null;
  /** True when PubChem marks the configuration as predicted or calculated. */
  configPredicted: boolean;
  /** Per-record qualification for a source conflict or unresolved prediction. */
  note?: string;
}

type CompleteElementSnapshot = {
  _meta: {
    schema: string;
    sourceUrl: string;
    sourceHashSha256: string;
    retrievedOn: string;
    sourceUnits: Record<string, string>;
    outputUnits: Record<string, string>;
    notes: string[];
  };
  elements: Record<string, CompleteElementData>;
};

const completeElementSnapshot = snapshot as CompleteElementSnapshot;

/** PubChem periodic-table values, with temperatures converted from K to °C. */
export const completeElementData: Record<string, CompleteElementData> =
  completeElementSnapshot.elements;

export const completeElementDataSource = completeElementSnapshot._meta;
