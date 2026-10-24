import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { usePreferencesStore, type ThemePreference } from '@/stores/preferences-store';

import { SampleForm } from './sample-form';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Home() {
  const { t } = useTranslation();
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [secureStatus, setSecureStatus] = useState<string | null>(null);

  async function checkSecureStore() {
    try {
      await SecureStore.setItemAsync('base-check', 'ok');
      setSecureStatus(`secure-store: ${await SecureStore.getItemAsync('base-check')}`);
    } catch (error) {
      setSecureStatus(`secure-store: error ${String(error)}`);
    }
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="items-center gap-4 px-6 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-foreground text-3xl font-bold">{t('home.title')}</Text>

      <Text className="text-muted-foreground text-sm">Theme: {theme}</Text>
      {THEMES.map((item) => (
        <Button
          key={item.value}
          variant={theme === item.value ? 'default' : 'outline'}
          onPress={() => setTheme(item.value)}
        >
          <ButtonText>{item.label}</ButtonText>
        </Button>
      ))}

      <SampleForm onSubmit={(v) => setSubmitted(v.email)} />
      {submitted !== null && (
        <Text className="text-foreground">{t('form.submitted', { email: submitted })}</Text>
      )}

      <Button onPress={checkSecureStore}>
        <ButtonText>Secure store check</ButtonText>
      </Button>
      {secureStatus !== null && <Text className="text-foreground">{secureStatus}</Text>}

      <Button onPress={() => setShowModal(true)}>
        <ButtonText>Open modal</ButtonText>
      </Button>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-foreground text-lg font-semibold">Base check</Text>
            <ModalCloseButton accessibilityLabel="Close" hitSlop={12} className="p-2">
              <Text className="text-foreground">X</Text>
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text className="text-foreground">gluestack-ui v5 with Uniwind works.</Text>
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setShowModal(false)}>
              <ButtonText>Close</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
