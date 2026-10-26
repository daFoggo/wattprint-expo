import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import en from '@/i18n/locales/en.json';

import { Settings } from '.';

// The Modal animates with Reanimated, whose native worklets runtime does not exist under Jest.
jest.mock('react-native-reanimated', () => {
  const chain: object = new Proxy(() => chain, { get: () => () => chain });
  return {
    __esModule: true,
    default: { createAnimatedComponent: <T,>(component: T) => component },
    Easing: { linear: 'linear' },
    FadeIn: chain,
    FadeOut: chain,
    ZoomIn: chain,
  };
});

describe('Settings modal', () => {
  async function openModal() {
    await render(
      <GluestackUIProvider>
        <Settings />
      </GluestackUIProvider>,
    );
    await fireEvent.press(screen.getByText(en.settings.openModal));
    await screen.findByText(en.settings.modalBody);
  }

  it('marks the modal title as a header', async () => {
    await openModal();
    expect(screen.getAllByRole('header', { name: en.settings.modalTitle })).toHaveLength(1);
  });

  it('closes from the labelled icon close button, which renders an icon instead of an X', async () => {
    await openModal();
    expect(screen.queryByText('X')).toBeNull();
    await fireEvent.press(screen.getByLabelText(en.common.close));
    expect(screen.queryByText(en.settings.modalBody)).toBeNull();
  });
});
