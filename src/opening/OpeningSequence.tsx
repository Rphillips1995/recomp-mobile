import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, AppState, BackHandler, Easing,
  Platform, Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { completeOpening, getLaunchQuote } from './launch';
import { OpeningQuote, QUOTES } from './quotes';

type Presentation = { quote: OpeningQuote; reduceMotion: boolean };

export function OpeningSequence({ onComplete }: { onComplete: () => void }) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    animation.current?.stop();
    completeOpening();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    let live = true;
    let started = false;
    const begin = (value: Presentation) => {
      if (!live || started || finished.current) return;
      started = true;
      setPresentation(value);
    };
    // Even an unresponsive preference/accessibility API cannot trap the user.
    const fallback = setTimeout(() => begin({ quote: QUOTES[0], reduceMotion: true }), 800);
    Promise.all([
      getLaunchQuote(),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => true),
    ]).then(([quote, reduceMotion]) => {
      begin({ quote, reduceMotion });
      clearTimeout(fallback);
    });
    return () => { live = false; clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    // Dismiss if backgrounded mid-intro; never replay on returning to training.
    const state = AppState.addEventListener('change', next => {
      if (next === 'background') finish();
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { finish(); return true; });
    return () => { state.remove(); back.remove(); };
  }, [finish]);

  useEffect(() => {
    if (!presentation || finished.current) return;
    const { reduceMotion } = presentation;
    quoteOpacity.setValue(0);
    brandOpacity.setValue(0);
    overlayOpacity.setValue(1);
    const fade = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue, duration: reduceMotion ? 0 : duration,
        easing: Easing.inOut(Easing.quad), useNativeDriver: true,
      });
    const sequence = Animated.sequence([
      Animated.delay(reduceMotion ? 0 : 350),
      fade(quoteOpacity, 1, 650),
      Animated.delay(2400),
      fade(quoteOpacity, 0, 400),
      fade(brandOpacity, 1, 600),
      Animated.delay(900),
      fade(overlayOpacity, 0, 500),
    ]);
    animation.current = sequence;
    sequence.start(({ finished: didFinish }) => { if (didFinish) finish(); });
    return () => { sequence.stop(); animation.current = null; };
  }, [presentation, quoteOpacity, brandOpacity, overlayOpacity, finish]);

  const quote = presentation?.quote;
  return (
    <Animated.View testID="opening-overlay" style={[styles.overlay, { opacity: overlayOpacity }]} accessibilityViewIsModal>
      <StatusBar style="light" animated={false} />
      <Pressable
        testID="opening-skip"
        style={styles.touchSurface}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel={quote ? `${quote.text} Recomp. On ${quote.theme.toLowerCase()}. Skip introduction.` : 'Skip introduction'}
        accessibilityHint="Opens your workout journal"
      >
        {/* Static hairlines suggest paper grain without images or animation. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
          {Array.from({ length: 48 }, (_, i) => (
            <View key={i} style={[styles.grain, { top: `${i * 2.1}%`, opacity: i % 3 === 0 ? 0.035 : 0.015 }]} />
          ))}
        </View>
        <SafeAreaView style={styles.content} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.stage}>
            <Animated.View style={[styles.quoteBlock, { opacity: quoteOpacity }]}>
              <Text style={styles.quote}>{quote?.text}</Text>
              <Text style={styles.attribution}>RECOMP / ON {quote?.theme}</Text>
            </Animated.View>
            <Animated.View style={[styles.brandBlock, { opacity: brandOpacity }]}>
              <Text style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit>RECOMP</Text>
              <Text style={styles.tagline}>THE WORK CONTINUES.</Text>
            </Animated.View>
          </View>
          <Text style={styles.skip}>TAP ANYWHERE TO CONTINUE</Text>
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#080A0C', zIndex: 10 },
  touchSurface: { flex: 1 },
  content: { flex: 1 },
  grain: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#E8E4DC' },
  stage: { flex: 1, marginHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  quoteBlock: { width: '100%', maxWidth: 440, paddingHorizontal: 12 },
  quote: { color: '#E8E4DC', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 28, lineHeight: 40, textAlign: 'center', fontWeight: '400' },
  attribution: { marginTop: 28, color: '#A68F6B', fontSize: 10, lineHeight: 18, letterSpacing: 2, textAlign: 'center' },
  brandBlock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  wordmark: { color: '#E8E4DC', fontSize: 42, fontWeight: '200', letterSpacing: 8, textAlign: 'center' },
  tagline: { color: '#A68F6B', fontSize: 10, lineHeight: 18, letterSpacing: 2.5, marginTop: 20, textAlign: 'center' },
  skip: { color: '#8C8D8F', fontSize: 9, lineHeight: 16, letterSpacing: 1.8, textAlign: 'center', paddingVertical: 24 },
});
