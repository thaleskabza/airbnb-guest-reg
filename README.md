This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Guest Registration (SA-Compliant)


This app collects guest details, selfie, ID/Passport image, and a signature, stores them in Vercel KV (Redis), and generates a PDF that forms your lodger register entry under the Immigration Act. It includes explicit POPIA consent and non-refund acknowledgement.


## Requirements
- Node 18+
- Vercel account
- Vercel KV (Redis) enabled on the project (or use dev fallback in-memory)


## Quick Start
```bash
pnpm i # or npm i / yarn
cp .env.local.example .env.local
# Fill KV_REST_API_URL and KV_REST_API_TOKEN (from Vercel KV dashboard)
pnpm dev
```


## Deploy
- Push to GitHub and import into Vercel.
- Add environment variables in Vercel: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (and optionally `KV_URL`).


## Legal/POPIA Considerations (Non-legal advice)
- Keep access limited; use Vercel Project members only.
- Set data retention (e.g., cron job to purge entries older than statutory period).
- Provide a privacy notice and purpose (Immigration Act compliance + guest management).
- Offer a data access request channel for guests.


## Notes
- Images are stored base64 inside the KV item for simplicity. For scale, consider Vercel Blob storage and only store URLs in KV.
- The PDF is generated on-demand from KV to avoid duplicating storage.
- If you need admin listing or deletion, add routes protected by Basic Auth / Vercel Access Controls.