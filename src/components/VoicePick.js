// Who reads this book: a round face on the reader's bar (the narrator's speech bubble, or the family member who
// recorded it: their photo, or the first letter of their name). Tapping it opens a rounded box listing the
// narrators and everyone who recorded this book; pick one and the book reads in that voice. Works with the grown-up controls locked (nothing here
// records, deletes or changes anything else). Pages a reader didn't record are read by the narrator.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { BubbleIcon, PersonIcon, Slider } from './Chrome';
import { withTap } from '../haptics';


// the face: a dark circle with the reader's photo (or the first letter of their name), or the narrator's speech bubble
export function VoiceFace({ photo, name, narrator = false, person = false, size = 36 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {photo ? <Image source={{ uri: photo }} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors />
        : person ? <View style={{ transform: [{ translateY: -size * 0.025 }] }}><PersonIcon size={size * 0.4} color="#8a8a8a" /></View>
        : narrator || !name ? <View style={{ transform: [{ translateY: size * 0.07 }] }}><BubbleIcon size={size * 0.5} color="#e0e0e0" /></View>
        : <Text allowFontScaling={false} style={{ color: '#e0e0e0', fontFamily: fonts.uiBold, fontSize: size * 0.44 }}>{name.trim().charAt(0).toUpperCase()}</Text>}
    </View>
  );
}

// the box: anchored just above the bar (upright) or beside it (sideways)
// onEdit: Edit under the voices (edit the readers: photos, a new reader); left out when locked. A downward arrow in the
// top right corner closes the box.
export default function VoicePick({ options, value, onPick, onClose, tr, anchor, onEdit, speed, onSpeed, extra, extraTitle }) { // extra: Reading Options, under the voices (the box scrolls when it's all too tall) // speed / onSpeed: the reading speed slider under the voices (Jörg, 27 Oct 2026)
  const [sp, setSp] = useState(null);
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, []);
  const close = (then) => Animated.timing(a, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => { onClose(); then && then(); });
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 90 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityRole="button" accessibilityLabel={tr('Close')} />
      <Animated.View style={[styles.box, anchor, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        <ScrollView style={{ flexShrink: 1, borderRadius: 26 }} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 24, paddingBottom: 20, gap: 6 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { marginBottom: 16, marginRight: 40, color: colors.white, fontSize: 22, lineHeight: 28 }]} accessibilityRole="header">{tr('Who reads this book?')}</Text>{/* a bigger title (Jörg, 28 Oct 2026) */}
        {/* top right: a downward arrow closes the box (Jörg, 28 Oct 2026) */}
        <Pressable onPress={withTap(() => close())} hitSlop={14} accessibilityRole="button" accessibilityLabel={tr('Close')} style={styles.edit}>
          <View style={{ width: 12, height: 12, borderColor: 'rgba(255,255,255,0.8)', borderRightWidth: 2.2, borderBottomWidth: 2.2, transform: [{ translateY: -3 }, { rotate: '45deg' }] }} />
        </Pressable>
        {options.map((o) => {
          const on = o.id === value && !o.off; // (o.off: this voice isn't available for this book: grey, can't be picked)
          return (
            <Pressable key={o.id} disabled={!!o.off} onPress={withTap(() => close(() => onPick(o.id)))} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: !!o.off }}
              style={[styles.row, on && styles.rowOn, o.off && { opacity: 0.35 }]}>
              <VoiceFace photo={o.photo} name={o.name} narrator={o.narrator} size={44} />
              <Text numberOfLines={1} style={styles.name}>{o.name}</Text>
            </Pressable>
          );
        })}
        {/* Edit (the readers: photos, a new reader), under the voices; left out when locked */}
        {onEdit ? (
          <Pressable onPress={withTap(() => close(onEdit))} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Edit readers')} style={styles.editPill}>
            <Text style={styles.editText}>{tr('Edit')}</Text>
          </Pressable>
        ) : null}
        {onSpeed ? (
          <View style={{ marginTop: 30, marginBottom: 14, paddingTop: 24, paddingHorizontal: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' }}>{/* well apart from the voices (Jörg, 27 Oct 2026) */}
            <Text style={[styles.title, { marginLeft: 0, marginBottom: 8 }]}>{tr('Reading speed')}</Text>
            <Slider value={sp ?? speed} min={0.5} max={1.5} step={0.05} leftLabel={tr('Slower')} rightLabel={tr('Faster')} accessibilityLabel={tr('Reading speed')}
              format={(v) => `${v.toFixed(2).replace(/0$/, '')}×`} onChange={setSp} onDone={(v) => { setSp(null); onSpeed(Math.round(v * 100) / 100); }} />
          </View>
        ) : null}
        {extra ? (
          <View style={styles.extra}>
            {extraTitle ? <Text style={[styles.title, { marginLeft: 0, marginBottom: 8 }]}>{extraTitle}</Text> : null}
            {extra}
          </View>
        ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', width: 250, backgroundColor: '#000000', /* solid black, nothing shows through (Jörg, 27 Oct 2026) */ borderRadius: 26, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' },
  extra: { marginTop: 16, paddingTop: 24, paddingHorizontal: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)', gap: 6 },
  editPill: { alignSelf: 'flex-start', marginTop: 10, marginLeft: 8, height: 34, borderRadius: 17, paddingHorizontal: 18, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  editText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  edit: { position: 'absolute', top: 30, right: 20, padding: 2 }, // (in line with the bigger title)
  title: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.uiBold, fontSize: 14, marginLeft: 6, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 18 },
  rowOn: { backgroundColor: colors.green },
  name: { flex: 1, color: colors.white, fontFamily: fonts.uiBold, fontSize: 17 },
});
