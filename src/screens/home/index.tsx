import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';

export function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-6">
      <Text className="text-foreground text-3xl font-bold">Wattprint</Text>
      <Input className="w-full">
        <InputField placeholder="you@example.com" />
      </Input>
      <Button onPress={() => setShowModal(true)}>
        <ButtonText>Open modal</ButtonText>
      </Button>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-foreground text-lg font-semibold">Base check</Text>
            <ModalCloseButton>
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
    </View>
  );
}
