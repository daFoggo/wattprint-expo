import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { ProductRow } from '@/features/lab/components/product-row';
import { QuoteRow } from '@/features/lab/components/quote-row';
import { SearchField } from '@/features/lab/components/search-field';

const product = {
  id: 4,
  title: 'Phone',
  description: 'd',
  category: 'smartphones',
  price: 99.5,
  rating: 4,
  thumbnail: 'https://cdn.dummyjson.com/p/4.webp',
};

describe('ProductRow', () => {
  it('shows title, category and price, with an accessible label, and reports its id on press', async () => {
    const onPress = jest.fn();
    await render(<ProductRow product={product} onPress={onPress} />);
    expect(screen.getByText('Phone')).toBeTruthy();
    expect(screen.getByText('$99.50')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Phone, smartphones, $99.50' }));
    expect(onPress).toHaveBeenCalledWith(4);
  });
});

describe('QuoteRow', () => {
  it('shows the quote and its author', async () => {
    await render(<QuoteRow quote={{ id: 1, quote: 'Be kind', author: 'Someone' }} />);
    expect(screen.getByText('Be kind')).toBeTruthy();
    expect(screen.getByText('Someone')).toBeTruthy();
  });
});

describe('SearchField', () => {
  it('is a labelled input that reports typing', async () => {
    const onChangeText = jest.fn();
    await render(
      <SearchField
        value=""
        onChangeText={onChangeText}
        label="Search products"
        placeholder="Search"
      />,
    );
    const input = screen.getByLabelText('Search products');
    await fireEvent.changeText(input, 'phone');
    expect(onChangeText).toHaveBeenCalledWith('phone');
    expect(screen.getByPlaceholderText('Search')).toBeTruthy();
  });
});
