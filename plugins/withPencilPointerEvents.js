// Apple Pencil pressure and tilt (Jörg, 5 Nov 2026: "zero pressure effects" on iPad Pro): React Native only gives a
// touch's force on phones with 3D Touch, so on an iPad the Pencil's pressure always arrived as 0. Its W3C pointer
// events do carry the Pencil's pressure and tilt, but they're off unless the app turns them on before React Native
// starts. This adds that one line to the app's start-up (AppDelegate), each time the iOS project is made.
const { withAppDelegate } = require('expo/config-plugins');

const LINE = 'RCTSetDispatchW3CPointerEvents(true) // Apple Pencil pressure and tilt (plugins/withPencilPointerEvents.js)';

module.exports = function withPencilPointerEvents(config) {
  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('RCTSetDispatchW3CPointerEvents')) return cfg;
    if (cfg.modResults.language === 'swift') {
      // first thing in application(_:didFinishLaunchingWithOptions:)
      const m = src.match(/didFinishLaunchingWithOptions[^{]*\{\n/);
      if (!m) throw new Error('withPencilPointerEvents: application(_:didFinishLaunchingWithOptions:) not found');
      const at = m.index + m[0].length;
      src = src.slice(0, at) + '    ' + LINE + '\n' + src.slice(at);
    } else {
      const m = src.match(/didFinishLaunchingWithOptions[^{]*\{\n/);
      if (!m) throw new Error('withPencilPointerEvents: didFinishLaunchingWithOptions not found');
      const at = m.index + m[0].length;
      src = src.slice(0, at) + '  RCTSetDispatchW3CPointerEvents(YES); // Apple Pencil pressure and tilt\n' + src.slice(at);
      if (!src.includes('#import <React/RCTConstants.h>')) src = '#import <React/RCTConstants.h>\n' + src;
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
