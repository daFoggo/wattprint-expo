import { DeviceStatesProvider } from '@/features/devices/device-states';
import { useTabBarTheme } from '@/hooks/use-tab-bar-theme';

import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

// The signed-in part of the app; the root layout only mounts it for a signed-in user.
export default function AppLayout() {
  const { t } = useTranslation();
  const tabBarTheme = useTabBarTheme();

  return (
    <DeviceStatesProvider>
      <NativeTabs {...tabBarTheme}>
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(devices)">
          <NativeTabs.Trigger.Label>{t('tabs.devices')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="devices" sf="lightbulb.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(energy)">
          <NativeTabs.Trigger.Label>{t('tabs.energy')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="bolt" sf="bolt.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)">
          <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="settings" sf="gearshape.fill" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </DeviceStatesProvider>
  );
}
