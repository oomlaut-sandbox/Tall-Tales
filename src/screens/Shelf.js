// My Library and Book Store.
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Bar, BarMeta, Burger } from '../components/Chrome';
import { STORIES } from '../story';

function Tile({ u, cover, title, sub, onPress, onLongPress, plus }) {
  const ear = u * 3;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width: '47%', gap: 8 }} accessibilityRole="button">
      <View style={{ aspectRatio: 3 / 4, backgroundColor: '#828282', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {cover ? <Image source={cover} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        {plus ? <Text style={{ color: colors.white, fontSize: 64, fontWeight: '300' }}>+</Text> : null}
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: ear, borderBottomWidth: ear, borderLeftColor: 'transparent', borderBottomColor: '#262626' }} />
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderRightWidth: ear, borderTopWidth: ear, borderRightColor: 'transparent', borderTopColor: colors.white }} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </Pressable>
  );
}

function Band({ color, dark, title, sub }) {
  const insets = useSafeAreaInsets();
  const fg = dark ? colors.ink : colors.white;
  return (
    <View style={{ backgroundColor: color, paddingTop: insets.top + 40, paddingBottom: 22, paddingHorizontal: 24 }}>
      <Text style={{ color: fg, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32 }}>{title}</Text>
      <Text style={{ color: fg, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, opacity: 0.9 }}>{sub}</Text>
    </View>
  );
}

export function Library({ u, stories, openStory, openMenu, onCreate, onEdit }) {
  return (
    <View style={styles.screen}>
      <Band color={colors.orange} dark title="My Library" sub="Your stories, ready to read" />
      <ScrollView contentContainerStyle={styles.grid}>
        {stories.map((s) => (
          <Tile key={s.id} u={u} cover={s.pages[0] && s.pages[0].image} title={s.title}
            sub={s.mine ? `${s.pages.length} page${s.pages.length === 1 ? '' : 's'} · made by you · hold to edit` : `${s.author ? `by ${s.author} · ` : ''}${s.pages.length} pages · read-along`}
            onPress={() => openStory(s)} onLongPress={s.mine ? () => onEdit(s) : undefined} />
        ))}
        <Tile u={u} plus title="Create a story" sub="Add pictures and words" onPress={onCreate} />
      </ScrollView>
      <Bar u={u}><Burger u={u} onPress={openMenu} /><BarMeta title="My Library" /></Bar>
    </View>
  );
}

export function Store({ u, openStory, openMenu }) {
  return (
    <View style={styles.screen}>
      <Band color={colors.blue} title="Book Store" sub="Find and buy new stories" />
      <ScrollView contentContainerStyle={styles.grid}>
        <Text style={styles.note}>Buying and downloading stories arrives in a later build. For now, the sample story is free to read.</Text>
        {STORIES.map((s) => (
          <Tile key={s.id} u={u} cover={s.pages[0].image} title={s.title} sub={s.author ? `by ${s.author} · in your library` : 'Free sample · in your library'} onPress={() => openStory(s)} />
        ))}
      </ScrollView>
      <Bar u={u}><Burger u={u} onPress={openMenu} /><BarMeta title="Book Store" /></Bar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  grid: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22 },
  tileTitle: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, color: colors.ink },
  tileSub: { fontFamily: fonts.ui, fontSize: 13, color: '#444' },
  note: { width: '100%', backgroundColor: '#bdbdbd', padding: 16, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.ink },
});
