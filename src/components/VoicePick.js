// Who reads this book: a round face on the reader's bar (the narrator, or the felt character of the family
// member who recorded it). Tapping it opens a rounded box listing the narrator and everyone who recorded this
// book; pick one and the book reads in that voice. Works with the grown-up controls locked (nothing here
// records, deletes or changes anything else). Pages a reader didn't record are read by the narrator.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { feltFor } from '../profiles';
import { BubbleIcon } from './Chrome';
import { withTap } from '../haptics';

// the face: a dark circle with the reader's felt character, or the narrator's speech bubble
export function VoiceFace({ char, size = 36, ring = false }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: ring ? 2 : 0, borderColor: colors.green }}>
      {char ? <Image source={feltFor(char)} style={{ width: size * 0.86, height: size * 0.86, marginTop: size * 0.1 }} resizeMode="contain" />
        : <BubbleIcon size={size * 0.5} color="#e0e0e0" />}
    </View>
  );
}

// the box: anchored just above the bar (upright) or beside it (sideways)
export default function VoicePick({ options, value, onPick, onClose, tr, anchor }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, []);
  const close = (then) => Animated.timing(a, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => { onClose(); then && then(); });
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 90 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel={tr('Close')} />
      <Animated.View style={[styles.box, anchor, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        <Text style={styles.title}>{tr('Who reads this book?')}</Text>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={o.id} onPress={withTap(() => close(() => onPick(o.id)))} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[styles.row, on && styles.rowOn]}>
              <VoiceFace char={o.char} size={44} />
              <Text numberOfLines={1} style={styles.name}>{o.name}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', width: 250, backgroundColor: '#2b2b2d', borderRadius: 26, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14, gap: 6, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' },
  title: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.ui, fontWeight: '700', fontSize: 14, marginLeft: 6, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 18 },
  rowOn: { backgroundColor: colors.green },
  name: { flex: 1, color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17 },
});
