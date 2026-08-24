/**
 * Repins react/react-dom/react-is for the CI React-compatibility matrix.
 *
 * Both devDependencies and resolutions have to move together: transitive packages
 * declare loose react ranges, and without the resolutions entry yarn installs a
 * second copy under them, which breaks element identity at runtime.
 *
 * Usage: node scripts/set-react-version.js 19.2.0
 */
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('usage: node scripts/set-react-version.js <version>');
  process.exit(1);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

for (const name of ['react', 'react-dom', 'react-is']) {
  pkg.devDependencies[name] = version;
  pkg.resolutions[name] = version;
}

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log(`pinned react, react-dom and react-is to ${version}`);
