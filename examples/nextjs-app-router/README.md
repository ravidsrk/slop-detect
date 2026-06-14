# slop-detect example — Next.js

A minimal Next.js project that demonstrates how to wire slop-detect
into a typical build. Two pages, no production polish.

## Run

```bash
bun install
bun run dev
```

## Score

Deploy first, then:

```bash
npx slop-detect <your-url>
```

After `bun run build` and `bun run start`, run `bun run lint` for a reminder to score the production server with slop-detect.