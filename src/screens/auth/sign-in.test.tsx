import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import en from '@/i18n/locales/en.json';
import { ApiError } from '@/lib/errors';

import { SignInScreen } from './sign-in';

const mockPush = jest.fn();
const mockMutate = jest.fn();
let mockState: { isPending: boolean; error: Error | null } = { isPending: false, error: null };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/features/auth/hooks/use-sign-in', () => ({
  useSignIn: () => ({ mutateAsync: mockMutate, ...mockState }),
}));

async function renderScreen() {
  await render(
    <GluestackUIProvider>
      <SignInScreen />
    </GluestackUIProvider>,
  );
}

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText(en.auth.email), email);
  await fireEvent.changeText(screen.getByLabelText(en.auth.password), password);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = { isPending: false, error: null };
  mockMutate.mockResolvedValue(undefined);
});

describe('SignInScreen', () => {
  it('renders the email and password fields and the submit button', async () => {
    await renderScreen();
    expect(screen.getByLabelText(en.auth.email)).toBeOnTheScreen();
    expect(screen.getByLabelText(en.auth.password)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: en.auth.signIn.submit })).toBeOnTheScreen();
  });

  it('shows the validation message and does not sign in with invalid input', async () => {
    await renderScreen();
    await fill('nope', 'short');
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signIn.submit }));
    expect(await screen.findByText(en.auth.validation.emailInvalid)).toBeOnTheScreen();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('signs in once with the typed credentials even when submit is pressed twice', async () => {
    mockMutate.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    await fill('a@example.com', 'password123');
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signIn.submit }));
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signIn.submit }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' });
  });

  it('shows a readable, selectable message for wrong credentials', async () => {
    mockState = { isPending: false, error: new ApiError(401, 'Invalid email or password', {}) };
    await renderScreen();
    const message = screen.getByText(en.auth.errors.invalidCredentials);
    expect(message.props.selectable).toBe(true);
  });

  it('goes to the sign-up screen from the link', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText(en.auth.signIn.toSignUp));
    expect(mockPush).toHaveBeenCalledWith('/sign-up');
  });
});
