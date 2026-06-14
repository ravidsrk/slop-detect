export default function CliPage() {
  return (
    <article>
      <h1 className="mb-6 text-3xl font-bold">CLI</h1>
      <pre className="overflow-x-auto border border-[var(--border)] bg-[#111] p-4 text-sm">
        <code>npx slop-detect &lt;url&gt;</code>
      </pre>
    </article>
  );
}
