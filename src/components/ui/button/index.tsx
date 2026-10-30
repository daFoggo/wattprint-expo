'use client';
import { createButton } from '@gluestack-ui/core/button/creator';
import {
  tva,
  useStyleContext,
  withStyleContext,
  type VariantProps,
} from '@gluestack-ui/utils/nativewind-utils';
import { StyledUIIcon } from '../icon';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
const SCOPE = 'BUTTON';
const Root = withStyleContext(Pressable, SCOPE);
const UIButton = createButton({
  Root: Root,
  Text,
  Group: View,
  Spinner: ActivityIndicator,
  Icon: StyledUIIcon,
});
const buttonStyle = tva({
  base: 'rounded-2xl flex-row items-center justify-center data-[disabled=true]:opacity-40 gap-2 h-fit',
  variants: {
    variant: {
      default: 'bg-primary-strong data-[active=true]:bg-primary-strong/90',
      destructive:
        'bg-destructive data-[active=true]:bg-destructive/90 dark:bg-destructive/60 dark:data-[active=true]:bg-destructive/50',
      outline:
        'border border-border bg-background data-[active=true]:bg-accent dark:bg-input/[0.045] dark:border-border/90 dark:data-[active=true]:bg-input/[0.075]',
      secondary: 'bg-secondary text-secondary-foreground data-[active=true]:bg-secondary/80',
      ghost: 'data-[active=true]:bg-accent dark:data-[active=true]:bg-accent/50',
      link: 'text-primary-strong underline-offset-4 data-[active=true]:underline',
    },
    // Deviation from upstream gluestack: every size is at least 48dp (min-h-12) tall, the Android
    // touch target minimum; lg is min-h-14 so it stays larger than default. Upstream uses min-h-8
    // (sm), min-h-10 (lg), min-h-9 (icon), none (default).
    size: {
      default: 'min-h-12 px-4 py-2',
      sm: 'min-h-12 rounded-2xl px-3 text-xs',
      lg: 'min-h-14 rounded-2xl px-8',
      icon: 'min-h-12 min-w-12',
    },
  },
});
const buttonTextStyle = tva({
  base: 'font-semibold',
  parentVariants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground data-[active=true]:text-accent-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground ',
      link: 'text-primary-strong data-[active=true]:underline',
    },
    size: {
      default: 'text-base',
      sm: 'text-xs',
      lg: 'text-base',
      icon: 'text-base',
    },
  },
});

const buttonSpinnerStyle = tva({
  base: '',
  parentVariants: {
    size: {
      default: 'h-4 w-4',
      sm: 'h-3 w-3',
      lg: 'h-5 w-5',
      icon: 'h-4 w-4',
    },
  },
});

// ActivityIndicator takes its colour from the non-style `color` prop, so it needs an accent- class.
const buttonSpinnerColorStyle = tva({
  base: '',
  parentVariants: {
    variant: {
      default: 'accent-primary-foreground',
      destructive: 'accent-destructive-foreground',
      outline: 'accent-foreground',
      secondary: 'accent-secondary-foreground',
      ghost: 'accent-foreground',
      link: 'accent-primary-strong',
    },
  },
});

const buttonIconStyle = tva({
  base: 'fill-none pointer-events-none shrink-0',
  parentVariants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-primary-strong',
    },
    size: {
      default: 'h-4 w-4',
      sm: 'h-3 w-3',
      lg: 'h-5 w-5',
      icon: 'h-4 w-4',
    },
  },
});
const buttonGroupStyle = tva({
  base: '',
  variants: {
    space: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-5',
      '2xl': 'gap-6',
      '3xl': 'gap-7',
      '4xl': 'gap-8',
    },
    isAttached: {
      true: 'gap-0',
    },
    flexDirection: {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    },
  },
});
type IButtonProps = Omit<React.ComponentPropsWithoutRef<typeof UIButton>, 'context'> &
  VariantProps<typeof buttonStyle> & { className?: string };
const Button = React.forwardRef<React.ElementRef<typeof UIButton>, IButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <UIButton
        ref={ref}
        {...props}
        className={buttonStyle({ variant, size, class: className })}
        context={{ variant, size }}
      />
    );
  },
);
type IButtonTextProps = React.ComponentPropsWithoutRef<typeof UIButton.Text> &
  VariantProps<typeof buttonTextStyle> & { className?: string };
const ButtonText = React.forwardRef<React.ElementRef<typeof UIButton.Text>, IButtonTextProps>(
  ({ className, size, ...props }, ref) => {
    const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE);
    return (
      <UIButton.Text
        ref={ref}
        {...props}
        className={buttonTextStyle({
          parentVariants: {
            size: parentSize,
            variant: parentVariant,
          },
          size,
          class: className,
        })}
      />
    );
  },
);
const ButtonSpinner = React.forwardRef<
  React.ElementRef<typeof UIButton.Spinner>,
  React.ComponentPropsWithoutRef<typeof UIButton.Spinner>
>(({ className, ...props }, ref) => {
  const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <UIButton.Spinner
      ref={ref}
      colorClassName={buttonSpinnerColorStyle({ parentVariants: { variant: parentVariant } })}
      {...props}
      className={buttonSpinnerStyle({ parentVariants: { size: parentSize }, class: className })}
    />
  );
});
type IButtonIcon = React.ComponentPropsWithoutRef<typeof UIButton.Icon> &
  VariantProps<typeof buttonIconStyle> & {
    className?: string | undefined;
    as?: React.ElementType;
    height?: number;
    width?: number;
  };
const ButtonIcon = React.forwardRef<React.ElementRef<typeof UIButton.Icon>, IButtonIcon>(
  ({ className, size, ...props }, ref) => {
    const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE);
    if (typeof size === 'number') {
      return (
        <UIButton.Icon
          ref={ref}
          {...props}
          className={buttonIconStyle({ class: className })}
          size={size}
        />
      );
    } else if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
      return (
        <UIButton.Icon ref={ref} {...props} className={buttonIconStyle({ class: className })} />
      );
    }
    return (
      <UIButton.Icon
        {...props}
        className={buttonIconStyle({
          parentVariants: {
            size: parentSize,
            variant: parentVariant,
          },
          size,
          class: className,
        })}
        ref={ref}
      />
    );
  },
);
type IButtonGroupProps = React.ComponentPropsWithoutRef<typeof UIButton.Group> &
  VariantProps<typeof buttonGroupStyle>;
const ButtonGroup = React.forwardRef<React.ElementRef<typeof UIButton.Group>, IButtonGroupProps>(
  ({ className, space = 'md', isAttached = false, flexDirection = 'column', ...props }, ref) => {
    return (
      <UIButton.Group
        className={buttonGroupStyle({
          class: className,
          space,
          isAttached,
          flexDirection,
        })}
        {...props}
        ref={ref}
      />
    );
  },
);
Button.displayName = 'Button';
ButtonText.displayName = 'ButtonText';
ButtonSpinner.displayName = 'ButtonSpinner';
ButtonIcon.displayName = 'ButtonIcon';
ButtonGroup.displayName = 'ButtonGroup';
export { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText };
