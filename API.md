# ResQAI REST API Documentation

The ResQAI backend provides a production-ready REST API built with Node.js, Express, TypeScript, Prisma ORM, JWT authentication, bcrypt password hashing, and Haversine distance calculations.

---

## Base URL

`/api`

All protected endpoints expect a standard HTTP Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Response Formats

### Standard Success Format
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

### Standard Error Format
```json
{
  "success": false,
  "message": "Detailed human-readable error explanation.",
  "errors": []
}
```

---

## Health Check

### `GET /api/health`
Checks backend server connectivity.
- **Authentication**: None (Public)
- **Response**:
```json
{
  "success": true,
  "message": "ResQAI backend is running"
}
```

---

## Authentication Endpoints

### `POST /api/auth/signup`
Creates a new user account with bcrypt password hashing and returns an auth JWT token.
- **Authentication**: Public (Rate-limited)
- **Request Body**:
```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "password": "EmergencyPassword123!",
  "phoneNumber": "555-0199",
  "countryCode": "+1"
}
```
- **Success Response (201)**:
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "id": "cm7...",
      "name": "Alex Mercer",
      "email": "alex@example.com",
      "phoneNumber": "555-0199",
      "countryCode": "+1",
      "createdAt": "2026-08-25T14:00:00.000Z",
      "updatedAt": "2026-08-25T14:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```
- **Error Example (400)**:
```json
{
  "success": false,
  "message": "An account with this email address already exists."
}
```

### `POST /api/auth/login`
Authenticates an existing user and returns a signed JWT token.
- **Authentication**: Public (Rate-limited)
- **Request Body**:
```json
{
  "email": "demo@resqai.org",
  "password": "Emergency123!"
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "cm7...",
      "name": "Alex Mercer",
      "email": "demo@resqai.org",
      "phoneNumber": "555-0199",
      "countryCode": "+1"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### `GET /api/auth/me`
Retrieves currently authenticated user from Bearer token.
- **Authentication**: Bearer Token
- **Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm7...",
      "name": "Alex Mercer",
      "email": "demo@resqai.org",
      "phoneNumber": "555-0199",
      "countryCode": "+1"
    }
  }
}
```

### `POST /api/auth/logout`
Logs out current session.
- **Authentication**: None
- **Response**:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

## User Profile Endpoints

### `GET /api/users/me`
Returns user profile details.
- **Authentication**: Bearer Token

### `PATCH /api/users/me`
Updates user profile, personal emergency contact number, or name.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "name": "Alex Mercer",
  "phoneNumber": "555-0199",
  "countryCode": "+1"
}
```

---

## Emergency Contacts Endpoints

### `GET /api/contacts`
Retrieves all emergency contacts for the authenticated user, ordered primary first.
- **Authentication**: Bearer Token

### `POST /api/contacts`
Creates an emergency contact.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "name": "Sarah Mercer",
  "relationship": "Spouse",
  "phone": "+1-555-0144",
  "isPrimary": true
}
```

### `PATCH /api/contacts/:id`
Updates an emergency contact.
- **Authentication**: Bearer Token

### `DELETE /api/contacts/:id`
Deletes an emergency contact.
- **Authentication**: Bearer Token

### `POST /api/contacts/:id/set-primary`
Designates contact as primary.
- **Authentication**: Bearer Token

---

## Incident & Triage Endpoints

### `POST /api/incidents`
Submits a new emergency incident report with auto-computed AI triage priority. Initial status: `REPORT_CREATED`.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "incidentType": "ROAD_ACCIDENT",
  "description": "Two vehicle collision on highway, driver pinned in sedan.",
  "peopleAffected": 2,
  "vehiclesInvolved": 2,
  "anyoneTrapped": true,
  "smokeOrFire": false,
  "latitude": 37.7749,
  "longitude": -122.4194,
  "locationAccuracy": 15
}
```
- **Success Response (201)**:
```json
{
  "success": true,
  "message": "Incident report created successfully.",
  "data": {
    "incident": {
      "id": "cm7...",
      "userId": "cm7...",
      "incidentType": "ROAD_ACCIDENT",
      "description": "Two vehicle collision on highway, driver pinned in sedan.",
      "peopleAffected": 2,
      "vehiclesInvolved": 2,
      "anyoneTrapped": true,
      "smokeOrFire": false,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "aiSummary": "Reported road accident involving approx. 2 person(s). Estimated 2 vehicle(s) involved. Entrapment reported on scene.",
      "aiPriority": "HIGH",
      "recommendedResources": ["AMBULANCE", "POLICE", "HOSPITAL"],
      "status": "REPORT_CREATED",
      "createdAt": "2026-08-25T14:00:00.000Z"
    }
  }
}
```

### `GET /api/incidents`
Fetches user incidents with filtering.
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `search` (e.g. `?search=Market`)
  - `type` (`ROAD_ACCIDENT`, `FIRE`, `MEDICAL`, `POLICE`, `NATURAL_DISASTER`)
  - `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `status` (`REPORT_CREATED`, `HELP_IDENTIFIED`, `ACTION_TAKEN`, `RESOLVED`)

### `GET /api/incidents/:id`
Fetches a specific incident by ID.
- **Authentication**: Bearer Token

### `PATCH /api/incidents/:id/status`
Updates tracking status.
- **Authentication**: Bearer Token
- **Request Body**:
```json
{
  "status": "HELP_IDENTIFIED"
}
```

### `DELETE /api/incidents/:id`
Deletes an incident record.
- **Authentication**: Bearer Token

### `POST /api/incidents/:id/share-data`
Returns a safe, sanitized emergency share package without credentials.
- **Authentication**: Bearer Token

---

## Nearest Emergency Resources Endpoints

### `GET /api/resources/nearby`
Calculates distance to registered emergency units using the Haversine formula and returns them sorted by nearest distance.
- **Authentication**: Public
- **Query Parameters**:
  - `latitude` (required, float)
  - `longitude` (required, float)
  - `type` (optional: `AMBULANCE`, `HOSPITAL`, `POLICE`, `FIRE_SERVICE`)
- **Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "origin": { "latitude": 37.7749, "longitude": -122.4194 },
    "count": 4,
    "resources": [
      {
        "id": "cm7...",
        "name": "Demo Ambulance Unit Alpha (Rapid EMT)",
        "type": "AMBULANCE",
        "distanceKm": 0.46,
        "phone": "+1-800-555-0111",
        "address": "Station 12 - 450 Golden Gate Ave, Civic Center",
        "availability": "AVAILABLE",
        "isDemo": true,
        "latitude": 37.7790,
        "longitude": -122.4180
      }
    ]
  }
}
```

---

## Smart Emergency Analysis Endpoint

### `POST /api/emergency/analyze`
Rule-based emergency scene triage & risk analysis.
- **Authentication**: Public / Protected
- **Request Body**:
```json
{
  "incidentType": "FIRE",
  "description": "Dense smoke coming from commercial warehouse basement",
  "peopleAffected": 4,
  "anyoneTrapped": true,
  "smokeOrFire": true
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Emergency incident analyzed successfully.",
  "data": {
    "incidentType": "FIRE",
    "summary": "Reported fire involving approx. 4 person(s). Entrapment reported on scene. Smoke or active fire present.",
    "suggestedPriority": "CRITICAL",
    "possibleHazards": [
      "Active fire, intense thermal radiation, or toxic smoke inhalation",
      "Physical entrapment requiring specialized extraction tools"
    ],
    "recommendedResources": ["FIRE_SERVICE", "AMBULANCE", "POLICE"],
    "missingInformation": [
      "Nearest cross-street or physical landmark for emergency responders"
    ],
    "disclaimer": "AI-assisted suggestion for prioritization and resource routing only. Not a substitute for official dispatch triage."
  }
}
```
