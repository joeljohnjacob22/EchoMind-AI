# EchoMind Backend — API Reference

A Node.js + Express backend for the EchoMind AI memory care app, backed by **Firebase Firestore** for data storage and **Firebase Storage** for media files.

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- A Firebase project (free Spark plan works for development)

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Firestore Database** (start in test mode for dev)
3. Enable **Storage**
4. Go to Project Settings → Service Accounts → Generate new private key
5. Download the JSON file and save it as `server/firebase-service-account.json`

### 3. Environment Setup
```bash
# In the /server directory
cp .env.example .env
```

Edit `.env` and fill in:
- `FIREBASE_PROJECT_ID` — your Firebase project ID
- `FIREBASE_STORAGE_BUCKET` — e.g. `your-project.appspot.com`
- `FIREBASE_SERVICE_ACCOUNT_PATH` — path to your downloaded JSON (default: `./firebase-service-account.json`)
- `JWT_SECRET` — a long random string (use `openssl rand -base64 32`)
- `CAREGIVER_ACCESS_CODE` — a code caregivers use to register

### 4. Install & Run
```bash
# Backend
cd server
npm install
npm run dev       # starts on http://localhost:5000

# Frontend (in another terminal)
cd EchoMind-AI
cp .env.example .env
npm install
npm run dev       # starts on http://localhost:5173
```

---

## API Endpoints

All protected routes require: `Authorization: Bearer <token>`

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register (patient or caregiver) |
| POST | `/api/auth/login` | ❌ | Login → returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/refresh` | ✅ | Refresh JWT |
| POST | `/api/auth/logout` | ✅ | Logout |

### Memories
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/memories` | ✅ | List memories (filter by favorite, type, year, personId) |
| GET | `/api/memories/search?q=...` | ✅ | Full-text search |
| POST | `/api/memories` | 🛡️ Caregiver | Create memory + upload files |
| GET | `/api/memories/:id` | ✅ | Get single memory |
| PATCH | `/api/memories/:id` | 🛡️ Caregiver | Update memory metadata |
| DELETE | `/api/memories/:id` | 🛡️ Caregiver | Delete memory + files |
| POST | `/api/memories/:id/favorite` | ✅ | Toggle favorite |
| GET | `/api/memories/:id/narrate` | ✅ | Get AI narration text + SSML |

### People
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/people` | ✅ | List all known people |
| POST | `/api/people` | 🛡️ Caregiver | Add person (+ avatar upload) |
| GET | `/api/people/:id` | ✅ | Get person + their memories |
| PATCH | `/api/people/:id` | 🛡️ Caregiver | Update person |
| DELETE | `/api/people/:id` | 🛡️ Caregiver | Remove person |
| POST | `/api/people/:id/recognize` | 🛡️ Caregiver | Face recognition on image |

### Places
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/places` | ✅ | List all places |
| POST | `/api/places` | 🛡️ Caregiver | Add a place |
| GET | `/api/places/:id` | ✅ | Get place + related memories |
| PATCH | `/api/places/:id` | 🛡️ Caregiver | Update place |
| DELETE | `/api/places/:id` | 🛡️ Caregiver | Remove place |

### AI Assistant
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/assistant/chat` | ✅ | Chat with AI assistant |
| GET | `/api/assistant/history` | ✅ | Get conversation history |
| POST | `/api/assistant/tts` | ✅ | Generate TTS SSML for text |
| POST | `/api/assistant/narrate` | ✅ | Narrate a memory |
| POST | `/api/assistant/recognize` | ✅ | Face recognition |
| GET | `/api/assistant/suggestions` | ✅ | Get chat suggestions |

### Settings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | ✅ | Get accessibility + theme settings |
| PATCH | `/api/settings` | ✅ | Update settings |

### Caregiver
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/caregiver/patients` | 🛡️ Caregiver | List linked patients |
| POST | `/api/caregiver/link` | 🛡️ Caregiver | Link to a patient by email |
| GET | `/api/caregiver/dashboard/:uid` | 🛡️ Caregiver | Patient stats + recent memories |

---

## Caregiver Multi-Patient Support

Caregivers can manage multiple patients. Pass `?patientId=<uid>` to any protected route to operate in that patient's context.

Example: `GET /api/memories?patientId=abc123`

---

## File Upload Format

Use `multipart/form-data` for memory creation:

```
POST /api/memories
Content-Type: multipart/form-data

fields:
  title         (string, required)
  date          (ISO 8601 string)
  location      (string)
  description   (string)
  people        (JSON array of person IDs)
  favorite      (boolean)
  type          (photo | video | audio)
  patientId     (string, caregiver only)

files:
  photos[]      (up to 20 image files)
  video         (1 video file)
  audio         (1 audio file)
```

---

## Firestore Data Structure

```
users/
  {userId}/
    email, name, role, passwordHash, settings, ...
    memories/
      {memoryId}/
        title, date, location, description, people[], favorite, type
        photos[], videoUrl, audioUrl, thumbnail, tags[], ...
    people/
      {personId}/
        name, relation, photo, notes, ...
    places/
      {placeId}/
        name, label, description, ...
    conversations/
      assistant/
        messages/
          {msgId}/
            userMessage, aiReply, intent, timestamp, memoryId
```

---

## AI Features (No External APIs Required)

| Feature | How it works |
|---------|-------------|
| **Memory narration** | Template-based NLG with warm, comforting language |
| **AI Chat assistant** | Rule-based NLU with intent detection (who/where/when/favorites/year) |
| **Auto-tagging** | Keyword + metadata extraction from title, description, date |
| **TTS** | SSML generation for Web Speech API on the frontend |
| **Face recognition** | Stub returning known people (plug in Vision API when ready) |

> All AI features are designed to be **drop-in replaceable** with real AI APIs (Gemini, OpenAI, AWS Rekognition, Google Vision, etc.) by simply replacing the service functions in `src/services/aiService.js`.

---

## Security

- Passwords hashed with **bcrypt** (12 rounds)  
- JWT tokens with configurable expiry  
- Role-based access control (patient vs caregiver)  
- Helmet.js security headers  
- Rate limiting (300 req/15min global, 20 req/15min for auth)  
- CORS restricted to configured origins  
- File type validation for uploads (image/video/audio only)  
- 50 MB max file size

---

## Development Notes

- Run with `npm run dev` (uses nodemon for hot reload)
- Logs written to `server/logs/` (combined.log + error.log)
- Uploads temporarily stored in `server/uploads/` then pushed to Firebase Storage
- The frontend `src/api.js` client replaces all mock data imports
