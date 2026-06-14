export type Post = {
  slug: string;
  title: string;
  content: string;
};

export const POSTS: Post[] = [
  {
    slug: 'hello',
    title: 'Hello',
    content: `This is a sample post for the slop-detect Next.js example.

It uses the App Router with a dynamic \`[slug]\` segment and a small in-memory
POSTS array — enough to demonstrate scoring a multi-page build without CMS wiring.

Deploy or run \`bun run start\`, then scan the live URL with slop-detect.`,
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}
