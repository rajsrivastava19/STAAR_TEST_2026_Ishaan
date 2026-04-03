# Math STAAR Test Prep for Ishaan

Starter full-stack scaffold for a kid-friendly Grade 3 STAAR math practice site.

## What this patch includes

- React + TypeScript client with a playful, third-grader-friendly UI
- Express API server
- Year-based manifest endpoint
- One playable normalized sample bundle: **2018 preview**
- Large buttons, clear progress, gentle animations, timer toggle, results, and review mode
- Local storage persistence for in-progress attempts

## What still needs to be added

- Full normalization of all uploaded year bundles into `/data/exams/*.json`
- Diagram/image extraction for visual questions
- Renderers for newer tech-enhanced STAAR item types

## Run locally

### 1) Install dependencies

```bash
npm install
npm install --workspace client
npm install --workspace server
```

### 2) Start the API server

```bash
npm run dev:server
```

### 3) Start the client

```bash
npm run dev:client
```

Client default URL: `http://localhost:5173`  
Server default URL: `http://localhost:4000`

## Data layout

- `/data/exams/manifest.json` lists the available years
- `/data/exams/2018-preview.json` contains the starter normalized sample

## Design notes

- Header text is fixed to **Math STAAR Test Prep for Ishaan**
- Palette is intentionally bright but calm: sky blue, mint green, sunshine yellow, and coral accents
- Font stack uses rounded system-friendly faces with clean fallbacks
- Motion is light and friendly, not distracting

## Next step

Use the companion Antigravity prompt to expand this scaffold into a full 2018–2025 normalized question bank driven by the uploaded PDFs.

