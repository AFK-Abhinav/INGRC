# 🚆 INGRC — Indian Next-Gen Rail Commerce

A modern, full-stack Indian railway booking and management platform built with **React**, **TypeScript**, **Express**, and the **Gemini AI API**. INGRC reimagines train travel as a smart, premium digital experience — from intelligent route planning to real-time crowding alerts and automated waitlist management.

---

## 💡 Why INGRC?

> IRCTC books tickets. INGRC manages your entire journey — from AI-powered route discovery to real-time overcrowding alerts, automated waitlist tracking, and digital penalty enforcement. Smarter, faster, and built with modern tech from the ground up.

---

## ✨ Features

### 🔍 Smart Route Search & Booking
- Search trains between any two Indian railway stations with real-time autocomplete
- **Direct train finder** — matches trains that serve both the origin and destination
- **1-transfer routing engine** — finds optimal journeys via major junction hubs (NDLS, BOM, HWH, BZA, etc.) with smart layover validation (30 min – 6 hrs)
- Fare estimation by travel class (Sleeper, 3AC, 2AC, First Class, Chair Car)
- Dynamic pricing with platform fees

### 🪑 PNR Status & Train Info
- Look up any PNR to see journey details: train, coach, seat, berth, status (CNF / RAC / WL)
- Full train schedule viewer — all stops with arrival/departure times, halt durations, and zone info
- Trains-between-stations listing with availability status (AVAILABLE / RAC / WL)

### ⚠️ Overcrowding Alert System
- Passengers can file overcrowding reports tied to PNR, train number, and coach
- Attach image evidence and GPS-detected station location
- TTE officers can update report status (PENDING → RESOLVED)
- Sorted and filterable alert dashboard

### ⏳ Waitlist Intelligence & Auto-Notifications
- Register waitlist monitoring jobs for any PNR
- Tracks confirmation probability over time windows (T-72h, T-48h, T-24h)
- Auto-dispatches WhatsApp / SMS notifications with current rank and alternative train options
- Dispatch log viewer with message history

### 💳 Payments & Seat Locking
- Seat locking sessions with 5-minute countdown timers
- Extendable payment sessions
- Webhook support for payment status updates (PENDING / SUCCESS / FAIL)

### 🚨 DigiChallan — Digital Penalty System
- TTE officers can issue digital challans for violations (travelling without ticket, littering, etc.)
- Passengers can pay challans online to clear dues
- Account freeze mechanism: unpaid challans trigger an IRCTC account freeze that blocks new alert filings
- Unfreeze flow on full payment clearance

### 👤 User Profiles & Loyalty Tiers
- Multi-tier loyalty program: **Silver**, **Gold**, **Platinum**
- Wallet balance and reward points per user
- Pre-seeded demo profiles (`voyager_01` — Gold, `voyager_elite_guest` — Platinum)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, Lucide React icons, Motion (Framer) |
| Backend | Express.js (TypeScript) with `tsx` for dev |
| AI | Google Gemini API (`@google/genai`) |
| Data | Local JSON datasets — stations, trains, schedules |
| Environment | `dotenv` for config management |

---

## 📂 Project Structure

```
├── server.ts          # Express API server (all backend routes)
├── src/
│   ├── App.tsx        # Root React component & routing
│   ├── components/    # UI components (search, alerts, challans, etc.)
│   ├── data.ts        # Client-side static data helpers
│   ├── types.ts       # Shared TypeScript types
│   └── index.css      # Global styles & Tailwind config
├── data/
│   ├── stations.json  # Indian railway station database (GeoJSON)
│   ├── trains.json    # Train metadata (GeoJSON)
│   └── schedules.json # Full stop-by-stop schedules
├── index.html         # SPA entry point
├── vite.config.ts     # Vite + Tailwind build config
└── .env.example       # Environment variable template
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# 3. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/stations?q=` | Station autocomplete search |
| `GET` | `/api/trains/popular?origin=` | Popular departing trains from a station |
| `GET` | `/api/search?origin=&destination=` | Full route planning (direct + 1-transfer) |
| `GET` | `/api/trains/between?from=&to=` | List trains between two stations |
| `GET` | `/api/trains/:number` | Train details |
| `GET` | `/api/trains/:number/schedule` | Full stop schedule for a train |
| `GET` | `/api/pnr/:pnr` | PNR status lookup |
| `GET` | `/api/alerts` | List overcrowding alerts |
| `POST` | `/api/alerts` | File a new overcrowding alert |
| `PATCH` | `/api/alerts/:id` | Toggle alert status (PENDING ↔ RESOLVED) |
| `GET` | `/api/waitlist-jobs` | List waitlist monitoring jobs |
| `POST` | `/api/waitlist-jobs` | Register a new waitlist job |
| `GET` | `/api/waitlist-jobs/alternatives` | Get alternative train options |
| `GET` | `/api/dispatch-logs` | View notification dispatch history |
| `POST` | `/api/payments/initiate` | Initiate a payment/seat-lock session |
| `POST` | `/api/payments/extend-session` | Extend an active payment session |
| `POST` | `/api/payments/webhook` | Update payment session status |
| `GET` | `/api/challans` | List all challans |
| `POST` | `/api/challans` | Issue a new DigiChallan |
| `POST` | `/api/challans/:id/pay` | Pay a challan |
| `GET` | `/api/users/:username/status` | Get user freeze status & wallet info |
| `POST` | `/api/users/:username/freeze-simulate` | Simulate account freeze (for testing) |
| `POST` | `/api/users/:username/unfreeze` | Unfreeze a user account |

---

## 🗂 Demo Accounts

| Username | Name | Tier | Points | Wallet |
|---|---|---|---|---|
| `voyager_01` | Arjun Ramesh | 🥇 Gold | 1,240 | ₹580 |
| `voyager_elite_guest` | Voyager Elite | 🏆 Platinum | 4,500 | ₹1,500 |
| `voyager_*` (any suffix) | Voyager \<suffix\> | 🥈 Silver | 420 | ₹150 |

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Express + Vite HMR) |
| `npm run build` | Build for production (Vite + esbuild) |
| `npm start` | Run the production build |
| `npm run lint` | TypeScript type-check |
| `npm run clean` | Remove build artifacts |

