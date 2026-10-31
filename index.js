import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { registerRootComponent } from 'expo';

// If something goes wrong, a friendly screen with Try again, instead of the app closing (Jörg, 31 Oct 2026).
// The details stay out of sight (a small "Details" link, for testing). Errors that aren't fatal go on to React
// Native's own handler as before, without taking over the screen.
let shownError = null;
const listeners = new Set();
function showError(e, where) {
  shownError = `${where}\n\n${(e && (e.stack || e.message)) || String(e)}`;
  listeners.forEach((f) => f(shownError));
}
if (global.ErrorUtils) {
  const before = global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((e, isFatal) => {
    if (isFatal) showError(e, 'Fatal error');
    else if (before) { try { before(e, false); } catch (x) {} }
  });
}

let App = null;
try {
  App = require('./App').default;
} catch (e) {
  showError(e, 'Error while loading the app');
}

// in the phone's language (the app's own word lists may be what failed, so these few are kept here)
const WORDS = {
  en: ['Oops! Something went wrong.', 'Your books are safe.', 'Try again', 'Details'],
  de: ['Hoppla! Da ist etwas schiefgegangen.', 'Deine Bücher sind sicher.', 'Noch einmal versuchen', 'Details'],
  fr: ['Oups ! Un problème est survenu.', 'Tes livres sont en sécurité.', 'Réessayer', 'Détails'],
  es: ['¡Uy! Algo salió mal.', 'Tus libros están a salvo.', 'Intentar de nuevo', 'Detalles'],
  ja: ['あれれ！ うまく いきませんでした。', '本は だいじょうぶです。', 'もういちど', 'くわしく'],
  ar: ['عذرًا! حدث خطأ ما.', 'كتبك في أمان.', 'حاول مرة أخرى', 'التفاصيل'],
};
const words = () => {
  let k = 'en';
  try { k = (Intl.DateTimeFormat().resolvedOptions().locale || 'en').slice(0, 2).toLowerCase(); } catch (e) {}
  return WORDS[k] || WORDS.en;
};

function ErrorScreen({ text, onRetry }) {
  const [more, setMore] = React.useState(false);
  const [title, safe, retry, details] = words();
  return (
    <View style={{ flex: 1, backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      <View style={{ width: '100%', maxWidth: 420, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 30, alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
        <Text style={{ color: '#d6d6d6', fontSize: 16, marginTop: 10, textAlign: 'center' }}>{safe}</Text>
        <Pressable onPress={onRetry} accessibilityRole="button" style={{ marginTop: 24, height: 46, borderRadius: 23, paddingHorizontal: 28, backgroundColor: '#487d49', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>{retry}</Text>
        </Pressable>
        <Pressable onPress={() => setMore((m) => !m)} hitSlop={10} accessibilityRole="button" style={{ marginTop: 18 }}>
          <Text style={{ color: '#7a7a7a', fontSize: 12 }}>{details}</Text>
        </Pressable>
      </View>
      {more ? <ScrollView style={{ maxHeight: '35%', width: '100%', marginTop: 16 }}><Text selectable style={{ color: '#9a9a9a', fontSize: 11, fontFamily: 'Menlo' }}>{text}</Text></ScrollView> : null}
    </View>
  );
}

class Boundary extends React.Component {
  state = { error: shownError, n: 0 };
  componentDidMount() { this.off = (t) => this.setState({ error: t }); listeners.add(this.off); }
  componentWillUnmount() { listeners.delete(this.off); }
  static getDerivedStateFromError(e) { return { error: `Error while drawing the screen\n\n${e.stack || e.message}` }; }
  retry = () => { shownError = null; this.setState((s) => ({ error: null, n: s.n + 1 })); }; // the app starts again, fresh
  render() {
    if (this.state.error || !App) return <ErrorScreen text={this.state.error || 'The app could not load.'} onRetry={this.retry} />;
    return <App key={this.state.n} />;
  }
}

registerRootComponent(Boundary);
