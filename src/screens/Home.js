// Home screen: the floating book, with Jörg's felt pebbles above and the menu below.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar } from '../components/Chrome';
import BookFrame, { Spine } from '../components/BookFrame';
import { Fade } from '../components/PageView';

function MenuItem({ u, color, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', gap: u * 4.6 }}>
      <View style={{ width: u * 16.5, height: u * 33 }}>
        <View style={{ flex: 1, backgroundColor: color }} />
        <View style={{ flex: 1, backgroundColor: colors.white }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Same sizes as the menu titles (20) and their descriptions (14). */}
        <Text style={{ fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, lineHeight: 24, color: colors.ink, marginBottom: u * 2 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 18, color: colors.ink }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export default function Home({ u, go, openMenu }) {
  // The home screen is a book too: the felt pebbles in the picture square, the menu in the words square.
  return (
    <BookFrame barMin={u * 17} bar={(L) => <Bar u={u} vertical={L.wide}><Burger u={u} onPress={openMenu} /></Bar>}>
      {({ side, wide }) => {
        const k = side / 100; // sizes inside the book scale with the squares
        return (
          <>
            <View style={{ width: side, height: side, backgroundColor: '#7d7d7d' }}>
              {/* Felt pebbles (Jörg's artwork). */}
              <Image source={require('../../assets/home-pebbles.jpg')} accessibilityLabel="oomlaut Reader"
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" />
              {!wide ? <Fade edge="bottom" size={Math.round(side * 0.05)} max={0.2} /> : null}
            </View>
            <View style={{ width: side, height: side, justifyContent: 'center', gap: k * 8, paddingLeft: k * 11.8, paddingRight: k * 8, backgroundColor: colors.paper }}>
              {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
              <Spine wide={wide} />
              <MenuItem u={k} color={colors.orange} title="My Library" sub="Find and read purchased stories" onPress={() => go('library')} />
              <MenuItem u={k} color={colors.blue} title="Book Store" sub="Find and buy new stories" onPress={() => go('store')} />
              <DogEar u={u} onPress={() => go('library')} label="Open my library" />
            </View>
          </>
        );
      }}
    </BookFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
});
