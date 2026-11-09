import { render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { useMe } from '@/features/profile/hooks/use-me';

jest.mock('@/features/profile/hooks/use-me', () => ({ useMe: jest.fn() }));

const wrap = (ui: React.ReactElement) => <GluestackUIProvider>{ui}</GluestackUIProvider>;

test('shows the profile FastAPI returned', async () => {
  jest.mocked(useMe).mockReturnValue({
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: jest.fn(),
    data: { id: 's', email: 'a@b.c', full_name: 'Ada', is_active: true, roles: ['user', 'admin'] },
  } as never);
  await render(wrap(<ProfileCard />));
  expect(screen.getByText('Ada')).toBeTruthy();
  expect(screen.getByText('a@b.c')).toBeTruthy();
  expect(screen.getByText(/user, admin/)).toBeTruthy();
});
