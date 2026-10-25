import { tva } from '@gluestack-ui/utils/nativewind-utils';

// Full-screen by default. Pass `className` (e.g. `flex-none p-2`) to use a state inline: tva merges
// it over this base, so conflicting utilities are replaced instead of stacked.
export const stateContainerStyle = tva({
  base: 'bg-background flex-1 items-center justify-center gap-3 p-6',
});
