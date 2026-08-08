# Users REST API

Production-ready **Node.js + Express** backend with **Turso Cloud Database** (libSQL), deployable on **Vercel**.

---

## Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Runtime    | Node.js ≥ 18                |
| Framework  | Express 4                   |
| Database   | Turso Cloud (libSQL/SQLite) |
| ORM / QL   | `@libsql/client` (raw SQL)  |
| Passwords  | bcrypt (10 salt rounds)     |
| Hosting    | Vercel (Serverless)         |

---

## Project Structure

```
backend/
├── server.js                 ← Entry point
├── package.json
├── vercel.json               ← Vercel deployment config
├── .env.example              ← Copy to .env and fill in credentials
├── postman_collection.json   ← Import into Postman
├── README.md
├── config/
│   └── db.js                 ← Turso client singleton
├── routes/
│   └── users.js              ← Route definitions
├── controllers/
│   └── userController.js     ← Request / response logic
├── models/
│   └── userModel.js          ← SQL queries + schema bootstrap
├── middleware/
│   └── errorHandler.js       ← Global error handler
└── utils/
    └── hash.js               ← bcrypt helpers
```

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS user (
    user_id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_login           TEXT     NOT NULL DEFAULT '',
    user_pass            TEXT     NOT NULL DEFAULT '',
    fname                TEXT     NOT NULL,
    lname                TEXT     NOT NULL,
    gender               TEXT     NOT NULL,
    user_level           INTEGER  NOT NULL DEFAULT 0,
    branch_cd            TEXT     NOT NULL DEFAULT '',
    email                TEXT     NOT NULL DEFAULT '',
    registered           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_activation_key  TEXT     NOT NULL DEFAULT '',
    isActive             INTEGER  NOT NULL DEFAULT 1
);
```

> The table is created automatically on first server start — no manual migration needed.

---

## API Endpoints

| Method   | Path              | Description         |
|----------|-------------------|---------------------|
| `GET`    | `/`               | Health check        |
| `GET`    | `/api/users`      | Get all users       |
| `GET`    | `/api/users/:id`  | Get user by ID      |
| `POST`   | `/api/users`      | Create user         |
| `PUT`    | `/api/users/:id`  | Update user         |
| `DELETE` | `/api/users/:id`  | Delete user         |

### POST /api/users — Request Body

```json
{
  "user_login":          "admin",
  "user_pass":           "123456",
  "fname":               "John",
  "lname":               "Doe",
  "gender":              "Male",
  "user_level":          1,
  "branch_cd":           "MNL",
  "email":               "john@example.com",
  "user_activation_key": "ABC123",
  "isActive":            1
}
```

### PUT /api/users/:id — Request Body (all fields optional)

```json
{
  "user_login":          "admin2",
  "fname":               "John Updated",
  "lname":               "Doe",
  "gender":              "Male",
  "user_level":          2,
  "branch_cd":           "CEB",
  "email":               "johnupdated@example.com",
  "user_activation_key": "XYZ123",
  "isActive":            1
}
```

### Response Format

**Success**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": { ... }
}
```

**Error**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## Local Setup

### 1. Clone / copy the project

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Turso credentials (see **Turso Configuration** below).

### 4. Start the server

```bash
npm start
```

The server starts at **http://localhost:3000**.

You should see:
```
✅  Server running on http://localhost:3000
✅  users table is ready
```

---

## Turso Configuration

### Step 1 — Create a Turso account

Go to **https://app.turso.tech** and sign up (free tier available).

### Step 2 — Install the Turso CLI (optional but handy)

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
irm https://get.tur.so/install.ps1 | iex

turso auth login
```

### Step 3 — Create a database

Via the **Turso dashboard** → click **Create Database**, name it (e.g. `users-db`), choose a region close to your Vercel deployment.

Or via CLI:
```bash
turso db create users-db
```

### Step 4 — Get your credentials

**Dashboard**: Go to your database → **Connect** → copy the `Database URL` and `Auth Token`.

**CLI**:
```bash
turso db show users-db      # shows the URL
turso db tokens create users-db  # creates an auth token
```

### Step 5 — Fill in .env

```env
TURSO_DATABASE_URL=libsql://users-db-yourname.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...your-token-here
PORT=3000
```

> The `user` table is created automatically when the server starts for the first time.

---

## Deploy to Vercel

### Step 1 — Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2 — Login

```bash
vercel login
```

### Step 3 — Add environment variables to Vercel

```bash
vercel env add TURSO_DATABASE_URL
# paste your Turso database URL when prompted

vercel env add TURSO_AUTH_TOKEN
# paste your Turso auth token when prompted
```

Or add them in the **Vercel Dashboard** → your project → **Settings** → **Environment Variables**.

> The `vercel.json` file references `@turso_database_url` and `@turso_auth_token` as secret names.
> If you prefer plain values, remove the `"env"` block from `vercel.json` and set variables directly.

### Step 4 — Deploy

```bash
vercel --prod
```

Vercel will output a URL like:
```
✅  Production: https://your-project.vercel.app
```

Test it:
```bash
curl https://your-project.vercel.app/
```

---

## Postman Setup

### Import the collection

1. Open **Postman**
2. Click **Import** (top-left)
3. Select `postman_collection.json` from this project
4. Click **Import**

### Set the base URL

The collection uses a variable `{{base_url}}`.

- For **local testing**: `http://localhost:3000`
- For **Vercel**: `https://your-project.vercel.app`

To set it:
1. Click the collection name → **Variables** tab
2. Set `base_url` current value → Save

### Requests included

| # | Name            | Method   | Path              |
|---|-----------------|----------|-------------------|
| 1 | Health Check    | `GET`    | `/`               |
| 2 | Get All Users   | `GET`    | `/api/users`      |
| 3 | Get User by ID  | `GET`    | `/api/users/1`    |
| 4 | Create User     | `POST`   | `/api/users`      |
| 5 | Update User     | `PUT`    | `/api/users/1`    |
| 6 | Delete User     | `DELETE` | `/api/users/1`    |

---

## Verification Checklist

Use this checklist before going to production.

### Local

- [ ] `npm install` completes without errors
- [ ] `.env` file created with valid Turso credentials
- [ ] `npm start` shows `✅  Server running` and `✅  users table is ready`
- [ ] `GET /` returns `{ "success": true, "message": "Users API is running" }`
- [ ] `POST /api/users` with valid body returns `201` and the new user (no `user_pass`)
- [ ] `GET /api/users` returns the created user
- [ ] `GET /api/users/1` returns the user
- [ ] `PUT /api/users/1` returns the updated user
- [ ] `DELETE /api/users/1` returns `{ "success": true, "message": "User deleted successfully" }`
- [ ] `GET /api/users/999` returns `404`
- [ ] `POST /api/users` with missing `fname` returns `400`
- [ ] `POST /api/users` with duplicate `user_login` returns `409`

### Vercel

- [ ] `vercel --prod` completes without errors
- [ ] Environment variables are set in Vercel dashboard or via CLI
- [ ] Production URL health check returns `200`
- [ ] All Postman requests pass against the production URL

---

## Security Notes

- Passwords are **always** hashed with bcrypt (10 rounds) before storage
- `user_pass` is **never** returned in any API response
- All SQL queries use **parameterised statements** (no SQL injection risk)
- CORS is enabled globally — restrict origins in production if needed

---

## License

MIT
