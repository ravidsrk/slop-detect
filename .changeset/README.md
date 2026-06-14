# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs for published packages.

When you make a change that should trigger a release, run `bun run changeset` from the repo root and add a changeset describing your change. On release, Changesets will bump package versions and update changelogs automatically.