// Home screen, measured from Jörg's mockup. All sizes are in u = 1% of screen width.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar } from '../components/Chrome';

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
  return (
    <View style={styles.screen}>
      <View style={{ flexBasis: u * 100, flexShrink: 1, minHeight: u * 52, backgroundColor: colors.red, justifyContent: 'center' }}>
        {/* Felt pebbles (Jörg's artwork). */}
        <Image
          source={require('../../assets/home-pebbles.jpg')}
          accessibilityLabel="oomlaut Reader"
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
      <View style={{ flexGrow: 1, flexShrink: 0, gap: u * 10, paddingTop: u * 12.5, paddingBottom: u * 10.5, paddingLeft: u * 11.8, paddingRight: u * 8, backgroundColor: colors.paper }}>
        <MenuItem u={u} color={colors.orange} title="My Library" sub="Find and read purchased stories" onPress={() => go('library')} />
        <MenuItem u={u} color={colors.blue} title="Book Store" sub="Find and buy new stories" onPress={() => go('store')} />
        <DogEar u={u} onPress={() => go('library')} label="Open my library" />
      </View>
      <Bar u={u}>
        <Burger u={u} onPress={openMenu} />
      </Bar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
});
