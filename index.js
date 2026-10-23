import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { registerRootComponent } from 'expo';

// If anything goes wrong while the app starts, show the error on screen instead of closing,
// so it can be read and fixed.
let shownError = null;
const listeners = new Set();
function showError(e, where) {
  shownError = `${where}\n\n${(e && (e.stack || e.message)) || String(e)}`;
  listeners.forEach((f) => f(shownError));
}
if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((e, isFatal) => showError(e, isFatal ? 'Fatal error' : 'Error'));
}

let App = null;
try {
  App = require('./App').default;
} catch (e) {
  showError(e, 'Error while loading the app');
}

function ErrorScreen({ text }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#111', paddingTop: 70, paddingHorizontal: 18 }}>
      <Text style={{ color: '#ff5a5a', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Coro Reader hit a problem</Text>
      <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 12 }}>Take a screenshot of this screen and send it to Claude.</Text>
      <ScrollView><Text selectable style={{ color: '#eee', fontSize: 12, fontFamily: 'Menlo' }}>{text}</Text></ScrollView>
    </View>
  );
}

class Boundary extends React.Component {
  state = { error: shownError };
  componentDidMount() { this.off = (t) => this.setState({ error: t }); listeners.add(this.off); }
  componentWillUnmount() { listeners.delete(this.off); }
  static getDerivedStateFromError(e) { return { error: `Error while drawing the screen\n\n${e.stack || e.message}` }; }
  render() {
    if (this.state.error || !App) return <ErrorScreen text={this.state.error || 'The app could not load.'} />;
    return <App />;
  }
}

registerRootComponent(Boundary);
