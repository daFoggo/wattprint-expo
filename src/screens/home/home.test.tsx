import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import en from '@/i18n/locales/en.json';

import { Home } from '.';

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

describe('Home modal', () => {
  async function openModal() {
    await render(
      <GluestackUIProvider>
        <Home />
      </GluestackUIProvider>,
    );
    await fireEvent.press(screen.getByText(en.home.openModal));
    await screen.findByText(en.home.modalBody);
  }

  it('marks the modal title as a header', async () => {
    await openModal();
    // The page title has the same text, so expect both the page header and the modal header.
    expect(screen.getAllByRole('header', { name: en.home.modalTitle })).toHaveLength(2);
  });

  it('closes from the labelled icon close button, which renders an icon instead of an X', async () => {
    await openModal();
    expect(screen.queryByText('X')).toBeNull();
    await fireEvent.press(screen.getByLabelText(en.common.close));
    expect(screen.queryByText(en.home.modalBody)).toBeNull();
  });
});
