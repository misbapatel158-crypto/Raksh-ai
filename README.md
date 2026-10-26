# ResQAI - Emergency Response & Resource Routing Coordination

ResQAI is an emergency response coordination platform combining fast browser geolocation capture, rule-based AI triage severity scoring, and Haversine nearest responder routing.

---

## Features

- **One-Touch SOS & Geolocation**: Instant browser GPS acquisition with accuracy tracking in meters.
- **AI Scene Triage & Prioritization**: Evaluates people affected, vehicle collisions, entrapment, and fire/smoke to compute severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), identify scene hazards, and suggest recommended resource categories.
- **Smart Nearest Responder Routing**: Computes spherical great-circle distances using the Haversine formula to sort emergency units nearest first (`AMBULANCE`, `HOSPITAL`, `POLICE`, `FIRE_SERVICE`).
- **One-Touch Calling & Navigation**: Direct `tel:` links and Google Maps navigation for fast action.
- **Safety Contacts Management**: Add, edit, delete, and designate primary emergency contacts with personal phone number security.
- **Incident Lifecycle Tracking**: Real-time status management (`REPORT_CREATED` ➔ `HELP_IDENTIFIED` ➔ `ACTION_TAKEN` ➔ `RESOLVED`).
- **Safe Emergency Sharing**: Sanitize and export emergency alert text and coordinates for messaging apps or clipboard.

---

## Tech Stack

### Backend
- **Runtime**: Node.js & Express.js with TypeScript
- **Database & ORM**: SQLite / PostgreSQL with Prisma ORM
- **Security & Auth**: JWT (jsonwebtoken), bcryptjs password hashing, Helmet headers, CORS, Zod schema validation, express-rate-limit
- **Algorithms**: Haversine distance formula, deterministic safety triage engine

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Lucide React Icons

---

## Folder Structure

```
├── prisma/
│   ├── schema.prisma         # Prisma database schema definition
│   └── seed.ts               # Database demo seed script
├── server/
│   └── src/
│       ├── controllers/      # Route controllers (Auth, Incident, Resource, Contacts, Emergency)
│       ├── middleware/       # Auth JWT, Zod validation, rate limiter, error handler
│       ├── routes/           # Express REST sub-routers
│       ├── services/         # Haversine distance, resource recommendations, AI triage
│       ├── utils/            # JWT helpers, bcrypt password hashing, math formulas
│       ├── prisma/           # Prisma client singleton
│       └── app.ts            # Express application setup
├── src/
│   ├── components/           # React UI components (Wizard, History, Contacts, ApiDocs)
│   ├── services/             # Centralized API client (api.ts)
│   ├── types.ts              # TypeScript shared interfaces & types
│   ├── App.tsx               # Main application component
│   └── main.tsx              # React DOM entry point
├── server.ts                 # Full-stack server entry point (Express + Vite)
├── API.md                    # Detailed REST API documentation
├── README.md                 # Project documentation
└── .env.example              # Environment variables template
```

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Environment variables:
- `DATABASE_URL`: Connection string (`file:./dev.db` for SQLite)
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: `3000`)
- `FRONTEND_URL`: Allowed CORS origin

### 3. Initialize Database & Seed Demo Data
```bash
npm run prisma:push
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 5. Production Build
```bash
npm run build
npm start
```

---

## Demo Account Credentials

For testing and hackathon evaluation:
- **Email**: `demo@resqai.org`
- **Password**: `Emergency123!`

The demo account includes pre-configured emergency contacts and sample resources.

---

## Hackathon Demo Flow

1. **Launch ResQAI**: Open the web application.
2. **Log In**: Click "Log In / Sign Up" and select "Quick Hackathon Demo Login" to log in as `demo@resqai.org`.
3. **Register Personal Contact**: Navigate to "Safety Contacts & Profile" and test adding or editing your phone number.
4. **Trigger SOS**: Click the prominent **SOS** button on the dashboard.
5. **Grant GPS Access**: Browser prompts for location; coordinates are acquired.
6. **Choose Emergency Type**: Select "Road Accident" and enter scene details (e.g. 2 people affected, 1 person trapped).
7. **AI Triage & Nearest Responders**: Review the computed `CRITICAL` or `HIGH` priority, identified scene hazards, and Haversine-sorted nearest ambulance & police units.
8. **Engage Call / Navigate / Share**: Test one-click direct call triggers, Google Maps navigation links, and the shareable emergency alert package.
9. **Track Incident**: Check "Incident History" to update the incident status from `REPORT_CREATED` to `HELP_IDENTIFIED`, `ACTION_TAKEN`, and `RESOLVED`.

---

## Safety & Hackathon Limitations

⚠️ **IMPORTANT NOTICE**:
ResQAI is a hackathon prototype developed for resource routing and triage workflow demonstration. It is **not** connected to live 911 / 112 Public Safety Answering Points (PSAPs) and does not guarantee dispatch of public emergency services. All emergency resources are tagged with `isDemo = true`. In a real life-threatening emergency, always dial **911** or your local emergency number directly.
