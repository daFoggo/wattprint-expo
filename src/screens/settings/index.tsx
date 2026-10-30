import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { CloseIcon, Icon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { useSignOut } from '@/features/auth/hooks/use-sign-out';
import { usePreferencesStore, type ThemePreference } from '@/stores/preferences-store';

import { SampleForm } from './sample-form';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export function Settings() {
  const { t } = useTranslation();
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const signOut = useSignOut();
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [secureStatus, setSecureStatus] = useState<string | null>(null);

  async function checkSecureStore() {
    try {
      await SecureStore.setItemAsync('base-check', 'ok');
      setSecureStatus(
        t('settings.secureStoreOk', { value: await SecureStore.getItemAsync('base-check') }),
      );
    } catch (error) {
      setSecureStatus(t('settings.secureStoreError', { message: String(error) }));
    }
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="items-center gap-4 px-6 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header" className="text-foreground text-3xl font-bold">
        {t('settings.title')}
      </Text>

      <Text className="text-muted-foreground text-sm">
        {t('settings.theme', { theme: t(`settings.themes.${theme}`) })}
      </Text>
      {THEMES.map((item) => (
        <Button
          key={item}
          variant={theme === item ? 'default' : 'outline'}
          accessibilityState={{ selected: theme === item }}
          onPress={() => setTheme(item)}
        >
          <ButtonText>{t(`settings.themes.${item}`)}</ButtonText>
        </Button>
      ))}

      <SampleForm onSubmit={(v) => setSubmitted(v.email)} />
      {submitted !== null && (
        <Text className="text-foreground">{t('form.submitted', { email: submitted })}</Text>
      )}

      <Button onPress={checkSecureStore}>
        <ButtonText>{t('settings.secureStore')}</ButtonText>
      </Button>
      {secureStatus !== null && (
        <Text selectable className="text-foreground">
          {secureStatus}
        </Text>
      )}

      <Button variant="outline" disabled={signOut.isPending} onPress={() => signOut.mutate()}>
        <ButtonText>{t('settings.signOut')}</ButtonText>
      </Button>

      <Button onPress={() => setShowModal(true)}>
        <ButtonText>{t('settings.openModal')}</ButtonText>
      </Button>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text accessibilityRole="header" className="text-foreground text-lg font-semibold">
              {t('settings.modalTitle')}
            </Text>
            <ModalCloseButton
              accessibilityLabel={t('common.close')}
              className="min-h-12 min-w-12 items-center justify-center"
            >
              <Icon as={CloseIcon} size="md" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text className="text-foreground">{t('settings.modalBody')}</Text>
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setShowModal(false)}>
              <ButtonText>{t('common.close')}</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
