import { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, Easing } from 'react-native'
import RoamUsLogo from './RoamUsLogo'

export default function AnimatedSplash() {
  const breathe = useRef(new Animated.Value(1)).current
  const glowOpacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breathe, {
            toValue: 1.08,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.35,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, {
        opacity: glowOpacity,
        transform: [{ scale: breathe }],
      }]} />
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <RoamUsLogo width={280} height={260} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#E8692A',
  },
})
