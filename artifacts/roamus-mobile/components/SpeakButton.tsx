import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface SpeakButtonProps {
  text: string;
  isSpeaking: boolean;
  onPress: (text: string) => void;
  size?: 'sm' | 'md';
  color?: string;
}

export function SpeakButton({ text, isSpeaking, onPress, size = 'md', color = '#8A8FA8' }: SpeakButtonProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(text)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.btn}
      accessibilityLabel={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
    >
      <Text style={{ fontSize: size === 'sm' ? 15 : 18, color }}>
        {isSpeaking ? '🔇' : '🔊'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
