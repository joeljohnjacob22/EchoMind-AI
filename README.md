# EchoMind AI — AI-Powered Multimedia Memory Reconstruction

> An AI-powered multimedia memory reconstruction system designed specifically for Alzheimer's and dementia patients and their caregivers.

EchoMind provides memory cueing, facial recognition of familiar faces, voice/chat companionship, and a caregiver portal with mood tracking and timeline playback.

---

## Project Structure

```
ECHOMIND/
├── EchoMind-AI/           # Frontend (React 18 + Vite + Tailwind/CSS)
│   ├── src/               # UI components, pages, context, and API client
│   ├── public/            # Static assets and reference images
│   └── package.json
├── server/                # Backend (Node.js + Express + Firebase)
│   ├── src/               # API routes, middleware, controllers, services
│   ├── seed_full_data.js  # Database seeding utility
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18 or newer
- **Firebase Project**: (Free Spark tier or Blaze plan) with Firestore and Firebase Storage enabled

---

### 2. Backend Setup (`server`)

```bash
cd server
npm install

# Copy environment example
cp .env.example .env
```

1. In the [Firebase Console](https://console.firebase.google.com/), generate a new private key from **Project Settings → Service Accounts**.
2. Save the key in `server/` as `firebase-service-account.json`.
3. Configure `.env` with your Firebase project details, storage bucket, and JWT secret.
4. Run the development server:

```bash
npm run dev
# Backend server runs at http://localhost:5000
```

---

### 3. Frontend Setup (`EchoMind-AI`)

```bash
cd EchoMind-AI
npm install

# Copy environment example
cp .env.example .env
```

Configure `VITE_API_URL=http://localhost:5000/api` in your `.env` (already the default).

```bash
npm run dev
# Frontend runs at http://localhost:5173
```

---

## Features

- **Elderly-Friendly UI**: High-contrast, large touch targets, simplified navigation.
- **Memory Reconstruction**: Multimedia memory cues with audio, tags, date, and people associations.
- **Face & Voice Recognition**: Identify loved ones from photos and real-time camera feed.
- **AI Companion**: Empathetic conversational assistant for reminiscing and grounding.
- **Caregiver Dashboard**: Patient mood analytics, memory logs, and quick reminders.
- **Secure Authentication**: Role-based access control (Patient & Caregiver) with JWT tokens.

---

## Security Note

Sensitive credentials (such as `firebase-service-account.json` and production `.env` files) are strictly ignored by `.gitignore` and must never be committed to source control.
