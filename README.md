# airbnb-guest-reg
Awesome — I spun up a complete, Vercel-ready Next.js app for your **online guest registration + selfie/ID upload + e-signature + PDF** flow. It uses **Vercel KV (Redis)** by default, with a simple in-memory fallback for local dev. It generates an A4 PDF that includes all fields + embedded selfie, ID/Passport image, and signature, with POPIA consent and Immigration Act register language.

I put everything (requirements, project tree, and full code) in the canvas to the right so you can copy/paste straight into a repo.

### What you’ll do next

1. Create a new repo and paste the files from the canvas.
2. In Vercel → Integrations, add **Vercel KV** and copy the env vars.
3. Add env vars in Vercel (and `.env.local` for local dev):

   * `KV_REST_API_URL`
   * `KV_REST_API_TOKEN`
   * (optional) `KV_URL`, `KV_REST_API_READ_ONLY_TOKEN`
4. `npm i && npm run dev` locally — then deploy to Vercel.

### Highlights

* **Register page** collects: full name, ID/passport, nationality, residence status, address, phone, email, check-in/out, guest count.
* **Uploads**: camera capture for selfie + ID/Passport (mobile friendly).
* **Signature**: smooth canvas signature (SignaturePad).
* **POPIA consent** + **Non-Refund acknowledgement** checkboxes (required).
* **Serverless**: `/api/submit` stores the record in KV; `/api/pdf/[id]` returns the generated PDF on demand.
* **Success page** gives the guest a download link to the PDF (printable “register” entry).
* **SA-compliant** wording: Immigration Act register + POPIA usage/retention language included.

Want me to add:

* an **Admin list/delete** screen with basic auth,
* **Vercel Blob** storage (so images aren’t base64 in KV),
* or a **cron job** to auto-purge records after the statutory retention period?

Say the word and I’ll extend the project.

