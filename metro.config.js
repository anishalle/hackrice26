const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// phosphor-react-native's "exports" field resolves its "import" condition to
// a build path Metro can't find. Keep package exports on (blobatar needs its
// subpath exports like "blobatar/expression") but prefer "require" so we
// never hit phosphor's broken "import" branch.
config.resolver.unstable_conditionNames = ['require', 'react-native', 'default'];

module.exports = config;
