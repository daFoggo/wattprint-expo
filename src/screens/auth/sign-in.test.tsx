import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import en from '@/i18n/locales/en.json';
import { ApiError } from '@/lib/errors';

import { SignInScreen } from './sign-in';

const mockMutate = jest.fn();
let mockState: { isPending: boolean; error: Error | null } = { isPending: false, error: null };

jest.mock('@/features/auth/hooks/use-sign-in', () => ({
  useSignIn: () => ({ mutate: mockMutate, ...mockState }),
}));

async function renderScreen() {
  await render(
    <GluestackUIProvider>
      <SignInScreen />
    </GluestackUIProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = { isPending: false, error: null };
});

describe('SignInScreen', () => {
  it('starts the Keycloak sign-in from the button', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signIn.submit }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('shows a readable, selectable message for an inactive account', async () => {
    mockState = { isPending: false, error: new ApiError(403, 'Inactive user', {}) };
    await renderScreen();
    expect(screen.getByText(en.auth.errors.inactiveUser).props.selectable).toBe(true);
  });

  it('shows the raw message of an unknown error', async () => {
    mockState = { isPending: false, error: new Error('boom') };
    await renderScreen();
    expect(screen.getByText('boom')).toBeOnTheScreen();
  });
});
