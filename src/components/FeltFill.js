// A felt surface for the bigger buttons: drop <FeltFill color="green" /> in as the first child of a
// button whose style has overflow: 'hidden'. Green is Jörg's felt; the others are the same fibres
// dyed to the app's button colours.
import React from 'react';
import { Image, StyleSheet } from 'react-native';

const FELT = {
  green: require('../../assets/felt-green.jpg'),
  red: require('../../assets/felt-red.jpg'),
  grey: require('../../assets/felt-grey.jpg'),
  dark: require('../../assets/felt-dark.jpg'),
  orange: require('../../assets/felt-orange.jpg'),
};

export default function FeltFill({ color = 'grey' }) {
  return <Image pointerEvents="none" source={FELT[color] || FELT.grey} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />;
}
