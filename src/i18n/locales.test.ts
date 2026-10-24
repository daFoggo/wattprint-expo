import en from './locales/en.json';
import vi from './locales/vi.json';

const keys = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

test('en and vi have the same keys', () => {
  expect(keys(vi).sort()).toEqual(keys(en).sort());
});
