# Xeno CRM - Frontend Client

This repository contains the single-page React client application for **Xeno CRM**, an AI-native customer relationship platform built with Vite, TypeScript, and modern vector styling.

---

## ✦ Features

* **Interactive Dashboards**: Real-time conversion funnel charts, SSE metrics log stream, and automated A/B test analysis views.
* **AI Copilot Workspace**: Interactive console that submits natural language marketer queries to generate customer segments dynamically.
* **App Ratings Auditor**: Aggregates rating distribution stats per brand platform and displays detailed positive and critical feedback alongside AI suggestions.
* **CSV Bulk Importer**: Front-end data parser featuring header-mapping preview tables for uploading customer lists and transaction logs.
* **Tab persistence on reload**: Navigation selection state is cached locally so tab state isn't lost on refresh.

---

## ✦ Directory Structure

```
├── src/
│   ├── components/
│   │   ├── AIAssistant.tsx        # Predefined library query selector & AI chat screen
│   │   ├── CampaignWizard.tsx     # Plain English prompt compiler & A/B variants panel
│   │   ├── CustomerList.tsx       # Shoppers list & CSV Bulk Importer modal
│   │   ├── Dashboard.tsx          # Real-time analytics funnel and metrics cards
│   │   ├── Navigation.tsx         # Obsidian sidebar layout
│   │   ├── QueueSettings.tsx      # Database controls & API key settings
│   │   ├── RatingsDashboard.tsx   # Platform reputation auditor
│   │   └── TerminalLogs.tsx       # Real-time SSE webhook event panel
│   ├── css/
│   │   └── index.css              # Custom HSL design tokens, neons, & animations
│   ├── App.tsx                    # Multi-tenant brand portal selection & layout routes
│   └── main.tsx
├── index.html                     # Root shell document
├── vite.config.ts                 # Dev port and proxy configuration
├── netlify.toml                   # Netlify build and SPA routing rules
├── package.json
└── README.md
```

---

## ✦ Getting Started (Local Development)

### 1. Install Dependencies
Run npm install in the frontend directory:
```bash
npm install
```

### 2. Configure Backend Proxy
By default, `vite.config.ts` is pre-configured to proxy all `/api` requests to a local backend running on `http://localhost:3000`. Make sure your backend service is running before starting the frontend dev server.

### 3. Run the Client
```bash
npm run dev
```
*(Starts the Vite dev server on `http://localhost:5173`)*

---

## ✦ Deployment (Netlify)

This client is pre-configured for automated deployment on Netlify using the included `netlify.toml` file.

1. Connect your Netlify account to this GitHub repository.
2. Select settings (pre-filled automatically by `netlify.toml`):
   * **Build command**: `npm run build`
   * **Publish directory**: `dist`
3. Configure the **Environment Variables**:
   * Add a variable named **`VITE_API_URL`** and set its value to your hosted backend URL (e.g., `https://your-backend.onrender.com`).
4. Trigger the deployment.
