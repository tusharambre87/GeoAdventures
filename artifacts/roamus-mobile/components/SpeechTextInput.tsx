import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSpeechToText } from '@/lib/useSpeechToText';

interface SpeechTextInputProps extends TextInputProps {
  onTranscript?: (text: string) => void;
}

export function SpeechTextInput({
  onChangeText,
  onTranscript,
  style,
  ...rest
}: SpeechTextInputProps) {
  const { isListening, start, stop } = useSpeechToText();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isListening) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  function handleMic() {
    if (isListening) {
      stop();
    } else {
      start((text) => {
        onTranscript?.(text);
        onChangeText?.(text);
      });
    }
  }

  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        {...rest}
        style={style}
        onChangeText={onChangeText}
      />
      <Animated.View
        style={[styles.micWrap, { transform: [{ scale: pulseAnim }] }]}
      >
        <TouchableOpacity
          onPress={handleMic}
          activeOpacity={0.7}
          style={[styles.micBtn, isListening && styles.micBtnActive]}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-off-outline'}
            size={15}
            color={isListening ? '#E8692A' : '#8A8FA8'}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  micWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  micBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(138,143,168,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: 'rgba(232,105,42,0.12)',
  },
});
