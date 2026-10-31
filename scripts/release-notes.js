// Prints GitHub release notes for a tag from the matching CHANGELOG.md section.
// Usage: node scripts/release-notes.js v1.2.3
import { readFileSync } from 'node:fs';

/** Returns the body of the `## <version>` section of a changesets CHANGELOG. */
function extractNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) {
    return '';
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: release-notes.js <tag>');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = tag.replace(/^v/, '');
const notes = extractNotes(readFileSync('CHANGELOG.md', 'utf8'), version);

console.log(
  `${notes || 'See CHANGELOG.md.'}\n\n\`npm install ${pkg.name}@${version}\``,
);
