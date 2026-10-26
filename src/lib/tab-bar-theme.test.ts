import { buildTabBarTheme } from './tab-bar-theme';

const tokens = {
  card: '255 255 255',
  muted: '236 238 237',
  mutedForeground: '101 108 104',
  primaryStrong: '6 122 70',
};

test('maps tokens to the flat Material tab bar colours', () => {
  expect(buildTabBarTheme(tokens)).toEqual({
    backgroundColor: 'rgb(255, 255, 255)',
    indicatorColor: 'rgb(236, 238, 237)',
    iconColor: { default: 'rgb(101, 108, 104)', selected: 'rgb(6, 122, 70)' },
    labelStyle: {
      default: { color: 'rgb(101, 108, 104)' },
      selected: { color: 'rgb(6, 122, 70)' },
    },
    rippleColor: 'rgb(236, 238, 237)',
  });
});

test('returns an empty theme until the tokens resolve, so the system defaults apply', () => {
  expect(buildTabBarTheme({})).toEqual({});
  expect(buildTabBarTheme({ ...tokens, card: undefined })).toEqual({});
});
