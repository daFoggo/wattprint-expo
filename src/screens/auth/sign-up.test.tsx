import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import en from '@/i18n/locales/en.json';
import { ApiError } from '@/lib/errors';

import { SignUpScreen } from './sign-up';

const mockReplace = jest.fn();
const mockMutate = jest.fn();
let mockState: { isPending: boolean; error: Error | null } = { isPending: false, error: null };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));
jest.mock('@/features/auth/hooks/use-sign-up', () => ({
  useSignUp: () => ({ mutateAsync: mockMutate, ...mockState }),
}));

async function renderScreen() {
  await render(
    <GluestackUIProvider>
      <SignUpScreen />
    </GluestackUIProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = { isPending: false, error: null };
  mockMutate.mockResolvedValue(undefined);
});

describe('SignUpScreen', () => {
  it('requires a name', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText(en.auth.email), 'a@example.com');
    await fireEvent.changeText(screen.getByLabelText(en.auth.password), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signUp.submit }));
    expect(await screen.findByText(en.auth.validation.nameRequired)).toBeOnTheScreen();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('signs up once with name, email and password', async () => {
    mockMutate.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText(en.auth.name), 'An');
    await fireEvent.changeText(screen.getByLabelText(en.auth.email), 'a@example.com');
    await fireEvent.changeText(screen.getByLabelText(en.auth.password), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signUp.submit }));
    await fireEvent.press(screen.getByRole('button', { name: en.auth.signUp.submit }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({
      name: 'An',
      email: 'a@example.com',
      password: 'password123',
    });
  });

  it('tells the user the email is already taken', async () => {
    const body = { status: 422, code: 'USER_ALREADY_EXISTS' };
    mockState = { isPending: false, error: new ApiError(422, 'User already exists', body) };
    await renderScreen();
    expect(screen.getByText(en.auth.errors.emailTaken).props.selectable).toBe(true);
  });

  it('goes back to sign-in from the link', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText(en.auth.signUp.toSignIn));
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });
});
