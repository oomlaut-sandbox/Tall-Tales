// Launch: the native splash screen is held until the app's first screen is ready, then hidden.
// `appShown` resolves once it has gone, so the start page's slide-in plays where it can be seen.
import * as SplashScreen from 'expo-splash-screen';

try { SplashScreen.preventAutoHideAsync().catch(() => {}); } catch (e) {}

let shown;
export const appShown = new Promise((res) => { shown = res; });
let hidden = false;
export function hideSplash() {
  if (hidden) return;
  hidden = true;
  const done = () => setTimeout(shown, 150);
  try { SplashScreen.hideAsync().then(done, done); } catch (e) { done(); }
  setTimeout(shown, 2500); // never wait longer than this
}
