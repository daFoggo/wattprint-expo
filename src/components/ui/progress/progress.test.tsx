import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Progress, ProgressFilledTrack } from '.';

// The creator writes the fill as `width: '<value>%'` in the FilledTrack style (verified:
// node_modules/@gluestack-ui/core/lib/esm/progress/creator/ProgressFilledTrack.jsx).
test('ProgressFilledTrack fills to the value', async () => {
  await render(
    <Progress value={40}>
      <ProgressFilledTrack testID="fill" />
    </Progress>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('fill').props.style).width).toBe('40%');
});
