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

describe('control boundary tokens', () => {
  it('uses the 3:1 greys from the design-system findings', () => {
    expect(readTheme('light').input[0]).toBeLessThanOrEqual(148);
    expect(readTheme('dark').input[0]).toBeGreaterThanOrEqual(100);
  });

  it('leaves the divider token untouched', () => {
    expect(readTheme('light').border).toEqual([229, 229, 229]);
    expect(readTheme('dark').border).toEqual([46, 46, 46]);
  });
});
