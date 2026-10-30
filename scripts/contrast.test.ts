// eslint-disable-next-line @typescript-eslint/no-require-imports
const { evaluate, ratio, readTheme, KNOWN_FAILURES } = require('./contrast-report');

type Row = { id: string; value: number; min: number; pass: boolean; known: boolean };
const rows: Row[] = evaluate();

describe('contrast math', () => {
  it('matches the WCAG reference values', () => {
    expect(ratio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(ratio([148, 148, 148], [255, 255, 255])).toBeCloseTo(3.03, 2);
  });
});

describe('documented token pairs', () => {
  it.each(rows.filter((r) => !r.known).map((r) => [r.id, r] as const))(
    '%s meets its threshold',
    (_id, r) => {
      expect(r.value).toBeGreaterThanOrEqual(r.min);
    },
  );

  it('keeps every known failure real (remove stale entries)', () => {
    for (const id of KNOWN_FAILURES) {
      const row = rows.find((r) => r.id === id);
      expect(row).toBeDefined();
      expect(row?.pass).toBe(false);
    }
  });
});

describe('switch thumb token', () => {
  it('exists in both themes and is covered by the pairs that hold', () => {
    expect(readTheme('light')['switch-thumb']).toEqual([255, 255, 255]);
    expect(readTheme('dark')['switch-thumb']).toEqual([255, 255, 255]);
    const rowIds = rows.map((r) => r.id);
    expect(rowIds).toEqual(
      expect.arrayContaining([
        'light:switch-thumb on primary',
        'dark:switch-thumb on primary',
        'dark:switch-thumb on card',
        'light:switch-thumb on input',
      ]),
    );
  });

  it('keeps the dark thumb readable on the off track', () => {
    const dark = readTheme('dark');
    expect(ratio(dark['switch-thumb'], dark.input)).toBeGreaterThanOrEqual(3);
  });
});

describe('control boundary tokens', () => {
  it('uses the 3:1 greys from the design-system findings', () => {
    expect(readTheme('light').input[0]).toBeLessThanOrEqual(148);
    expect(readTheme('dark').input[0]).toBeGreaterThanOrEqual(100);
  });
});
