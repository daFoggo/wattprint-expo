'use client';
import React from 'react';
import { createInput } from '@gluestack-ui/core/input/creator';
import { View, Pressable, TextInput } from 'react-native';
import { tva, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { StyledUIIcon } from '../icon';

const SCOPE = 'INPUT';

const UIInput = createInput({
  Root: withStyleContext(View, SCOPE),
  Icon: StyledUIIcon,
  Slot: Pressable,
  Input: TextInput,
});

const inputStyle = tva({
  base: 'min-h-12 w-full flex-row items-center rounded-2xl border-2 border-transparent bg-secondary overflow-hidden data-[focus=true]:border-ring data-[invalid=true]:border-destructive data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 px-3 gap-2',
});

const inputIconStyle = tva({
  base: 'justify-center items-center text-muted-foreground fill-none h-4 w-4',
});

const inputSlotStyle = tva({
  base: 'justify-center items-center',
});

const inputFieldStyle = tva({
  base: 'flex-1 text-foreground text-sm py-1 h-full',
});

type IInputProps = React.ComponentProps<typeof UIInput> &
  VariantProps<typeof inputStyle> & { className?: string };
const Input = React.forwardRef<React.ComponentRef<typeof UIInput>, IInputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <UIInput ref={ref} {...props} className={inputStyle({ class: className })} context={{}} />;
});

type IInputIconProps = React.ComponentProps<typeof UIInput.Icon> &
  VariantProps<typeof inputIconStyle> & {
    className?: string;
    height?: number;
    width?: number;
  };

const InputIcon = React.forwardRef<React.ComponentRef<typeof UIInput.Icon>, IInputIconProps>(
  function InputIcon({ className, ...props }, ref) {
    return <UIInput.Icon ref={ref} {...props} className={inputIconStyle({ class: className })} />;
  },
);

type IInputSlotProps = React.ComponentProps<typeof UIInput.Slot> &
  VariantProps<typeof inputSlotStyle> & { className?: string };

const InputSlot = React.forwardRef<React.ComponentRef<typeof UIInput.Slot>, IInputSlotProps>(
  function InputSlot({ className, ...props }, ref) {
    return (
      <UIInput.Slot
        ref={ref}
        {...props}
        className={inputSlotStyle({
          class: className,
        })}
      />
    );
  },
);

type IInputFieldProps = React.ComponentProps<typeof UIInput.Input> &
  VariantProps<typeof inputFieldStyle> & { className?: string };

const InputField = React.forwardRef<React.ComponentRef<typeof UIInput.Input>, IInputFieldProps>(
  function InputField({ className, ...props }, ref) {
    return (
      <UIInput.Input
        ref={ref}
        placeholderTextColorClassName="accent-muted-foreground"
        cursorColorClassName="accent-primary"
        selectionHandleColorClassName="accent-primary"
        selectionColorClassName="accent-primary/30"
        underlineColorAndroidClassName="accent-transparent"
        {...props}
        className={inputFieldStyle({
          class: className,
        })}
      />
    );
  },
);

Input.displayName = 'Input';
InputIcon.displayName = 'InputIcon';
InputSlot.displayName = 'InputSlot';
InputField.displayName = 'InputField';

export { Input, InputField, InputIcon, InputSlot };
