// Creates a GitLab release for a tag using the matching CHANGELOG.md section.
// Usage: node scripts/create-gitlab-release.js v1.2.3 [--dry-run]
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

async function main() {
  const [tag, flag] = process.argv.slice(2);
  if (!tag) {
    throw new Error('Usage: create-gitlab-release.js <tag> [--dry-run]');
  }

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = tag.replace(/^v/, '');
  const notes = extractNotes(readFileSync('CHANGELOG.md', 'utf8'), version);

  const body = {
    name: tag,
    tag_name: tag,
    description:
      `${notes || 'See CHANGELOG.md.'}\n\n` +
      `\`npm install ${pkg.name}@${version}\``,
  };

  if (flag === '--dry-run') {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const { CI_API_V4_URL, CI_PROJECT_ID, GITLAB_RELEASE_TOKEN } = process.env;
  const response = await fetch(
    `${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases`,
    {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': GITLAB_RELEASE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(
      `GitLab release failed: ${response.status} ${await response.text()}`,
    );
  }
  console.log(`Created GitLab release ${tag}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
