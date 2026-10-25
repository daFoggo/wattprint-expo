import { Image } from 'expo-image';
import { withUniwind } from 'uniwind';

// `expo-image` wrapped once so `className` works; shared by the product row and the detail screen.
export const StyledImage = withUniwind(Image);
