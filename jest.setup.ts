// FlashList measures its layout natively; this gives it a fixed size under Jest.
import '@shopify/flash-list/jestSetup';

// react-native-mmkv's index imports react-native-nitro-modules at load time, which needs the
// native TurboModule. MMKV itself switches to an in-memory mock under Jest (isTest()).
jest.mock('react-native-nitro-modules', () => ({ NitroModules: {} }));

// Reanimated's native worklets runtime does not exist under Jest (not even its official mock loads), so hooks run on
// the JS thread and entering/exiting animations are inert chains. A test can still override this with its own mock.
jest.mock('react-native-reanimated', () => {
  const chain: object = new Proxy(() => chain, { get: () => () => chain });
  return {
    __esModule: true,
    default: { createAnimatedComponent: <T>(component: T) => component },
    useSharedValue: <T>(initial: T) => {
      const ref = { value: initial, get: () => ref.value, set: (v: T) => (ref.value = v) };
      return ref;
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    interpolate: (x: number, input: number[], output: number[]) =>
      Math.min(
        Math.max(
          output[0] + ((x - input[0]) / (input[1] - input[0])) * (output[1] - output[0]),
          output[0],
        ),
        output[1],
      ),
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { linear: 'linear' },
    FadeIn: chain,
    FadeOut: chain,
    ZoomIn: chain,
  };
});

// The safe area insets come from a native view; this gives zero insets under Jest.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// react-aria (used by @gluestack-ui/utils) probes window.visualViewport and window.screen.orientation
// at load time when NODE_ENV === 'test'. The React Native jest env defines `window` without `screen`.
const jestWindow = (globalThis as unknown as { window?: Record<string, unknown> }).window;
if (jestWindow && jestWindow.screen == null) jestWindow.screen = {};

// victory-native draws on a Skia canvas, which needs native code. Under Jest the chart is a host View
// that keeps its `data` prop visible to tests, and `Bar` draws nothing.
jest.mock('victory-native', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    CartesianChart: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'cartesian-chart', data: props.data }),
    Bar: () => null,
  };
});

// @tanstack/form-core registers a devtools EventClient that starts a 300 ms reconnect setInterval,
// which keeps the Jest worker alive ("failed to exit gracefully"). Replace it with a no-op client.
jest.mock('@tanstack/devtools-event-client', () => ({
  EventClient: class {
    on() {
      return () => {};
    }
    emit() {}
  },
}));
