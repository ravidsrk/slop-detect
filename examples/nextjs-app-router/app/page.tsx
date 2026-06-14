import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Example Posts</h1>
      <p>A minimal Next.js App Router site for slop-detect integration demos.</p>
      <p>
        <Link href="/posts/hello">Read the sample post</Link>
      </p>
    </main>
  );
}
