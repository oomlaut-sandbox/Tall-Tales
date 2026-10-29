// A one-line text field whose words sit exactly in the middle, top to bottom (Jörg, 29 Oct 2026).
// The one-line iPhone field centres its words its own way and puts them low (seen in Search Help first), so this is
// the recipe that works there: a text box (multiline, one line only, no scrolling) as tall as the field, its single
// line placed in the middle by padding: paddingTop = (height - lineHeight) / 2, paddingBottom 0. Return finishes it
// (never a new line), and it doesn't grow with the phone's text size.
import React, { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';

const LineInput = forwardRef(function LineInput({ style, onChangeText, ...rest }, ref) {
  const flat = StyleSheet.flatten(style) || {};
  const fontSize = flat.fontSize || 17;
  const height = flat.height || Math.round(fontSize * 2.8);
  const lineHeight = Math.round(fontSize * 1.25);
  const { paddingVertical, paddingTop, paddingBottom, textAlignVertical, ...keep } = flat;
  return (
    <TextInput ref={ref} {...rest} multiline scrollEnabled={false} submitBehavior="blurAndSubmit" allowFontScaling={false}
      onChangeText={onChangeText ? (v) => onChangeText(v.replace(/\n/g, '')) : undefined}
      style={[keep, { height, lineHeight, paddingTop: Math.max(0, (height - lineHeight) / 2), paddingBottom: 0, includeFontPadding: false, textAlignVertical: 'top' }]} />
  );
});
export default LineInput;
