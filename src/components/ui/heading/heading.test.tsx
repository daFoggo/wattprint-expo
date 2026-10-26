import { render, screen } from '@testing-library/react-native';

import { Heading } from '.';

test('Heading is announced as a header', async () => {
  await render(<Heading>Title</Heading>);
  expect(screen.getByRole('header', { name: 'Title' })).toBeTruthy();
});
