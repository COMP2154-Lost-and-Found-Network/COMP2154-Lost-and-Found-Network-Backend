# Lost & Found Network — Backend

Group 84 | COMP 2154 

Node.js/Express REST API backed by MySQL.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MySQL](https://dev.mysql.com/downloads/mysql/) (v8+)
- [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) (optional, for visual DB management)

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd COMP2154-Lost-and-Found-Network-Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Open MySQL Workbench (or any MySQL client) and run the schema file:

```
File → Open SQL Script → lost_and_found.sql → Run
```

Or via terminal:

```bash
mysql -u root -p < lost_and_found.sql
```

### 4. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and update:

```env
# Can be other user with access limited to lost_found_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lost_found_db

# Mac (DMG install) — use socket path
DB_SOCKET=/tmp/mysql.sock

# Windows — leave DB_SOCKET blank, use host/port instead
# DB_SOCKET=
DB_HOST=localhost
DB_PORT=3306

# Add JWT secret key
JWT_SECRET=somethingHere

PORT=3000
```

> **Mac users:** MySQL connects via Unix socket. Set `DB_SOCKET=/tmp/mysql.sock`.
> **Windows users:** Leave `DB_SOCKET=` empty — TCP connection is used automatically.

### 5. Start the server

```bash
npm start
```

You should see:

```
Server started on port 3000
Database connected successfully
```

---

## Interaction with React

Use packages such as Axios to interact with back-end API endpoints within React code. All protected endpoints require an `Authorization: Bearer <token>` header.

```js
const [items, setItems] = useState({ data: [], total: 0, page: 1, totalPages: 1 });

useEffect(() => {
    const fetchItems = async () => {
        try {
            const res = await axios.get("http://localhost:3000/api/items?page=1&limit=10", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(res.data);
        } catch (e) {
            console.log(e);
        }
    };
    fetchItems();
}, []);
```

Back-end server needs to be run separately from front-end server.

---

## API Endpoints

### Auth

| Method | Endpoint             | Auth     | Description          |
|--------|----------------------|----------|----------------------|
| `POST` | `/api/auth/login`    | Public   | Login user           |
| `POST` | `/api/auth/logout`   | Token    | Logout user          |
| `POST` | `/api/auth/`         | Public   | Register new user    |

### Users

| Method | Endpoint         | Auth     | Description        |
|--------|------------------|----------|--------------------|
| `GET`  | `/api/users`     | Token    | Get all users      |
| `GET`  | `/api/users/:id` | Token    | Get user by ID     |
| `PUT`  | `/api/users/:id` | Token    | Update a user      |

### Items

| Method   | Endpoint          | Auth     | Description                                          |
|----------|-------------------|----------|------------------------------------------------------|
| `POST`   | `/api/items`      | Token    | Create lost/found item                               |
| `GET`    | `/api/items`      | Token    | List items (paginated, filterable by category, location, status, title) |
| `GET`    | `/api/items/:id`  | Token    | Get item by ID                                       |
| `PUT`    | `/api/items/:id`  | Token    | Update item (owner only)                             |
| `DELETE` | `/api/items/:id`  | Token    | Soft delete item (owner only)                        |

**Pagination:** `GET /api/items` returns `{ data, total, page, limit, totalPages }`. Query params: `page` (default 1), `limit` (default 10, max 100).

### Claims

| Method   | Endpoint                  | Auth     | Description                              |
|----------|---------------------------|----------|------------------------------------------|
| `POST`   | `/api/claims`             | Token    | Submit a claim                           |
| `GET`    | `/api/claims?claimant_id=X` | Token  | Get claims by claimant                   |
| `GET`    | `/api/claims/inbox`       | Token    | Get claims on the logged-in user's items |
| `GET`    | `/api/claims/:id`         | Token    | Get claim details (claimant/admin only)  |
| `PUT`    | `/api/claims/:id`         | Token    | Approve or reject a claim                |
| `PUT`    | `/api/claims/:id/assign`  | Admin    | Assign claim to a user                   |
| `DELETE` | `/api/claims/:id/withdraw`| Token    | Withdraw a pending claim (claimant only) |

### Upload

| Method | Endpoint       | Auth     | Description                              |
|--------|----------------|----------|------------------------------------------|
| `POST` | `/api/upload`  | Token    | Upload image (JPEG/PNG/GIF/WebP, max 5MB)|


> Accounts registered with a `@georgebrown.ca` email are automatically marked as verified members.

```
admin account set up
email: admin@georgebrown.ca
password: 1234
```

---

## Project Structure

```
├── app.js              # Express app configuration & route mounting
├── index.js            # Entry point, server startup
├── db.js               # MySQL connection pool
├── middleware/
│   ├── auth.js         # JWT token verification
│   ├── adminAuth.js    # Admin role verification
│   └── tokenBlacklist.js  # Token revocation (logout)
├── routes/
│   ├── auth.js         # Auth routes (login, logout, register)
│   ├── users.js        # User routes
│   ├── items.js        # Item CRUD routes
│   ├── claims.js       # Claim workflow routes
│   └── upload.js       # Image upload route
├── controllers/
│   ├── userController.js
│   ├── itemsController.js
│   ├── claimsController.js
│   └── emailController.js
├── models/
│   ├── userModel.js
│   ├── itemModel.js
│   ├── claimModel.js
│   └── emailLogModel.js
├── lost_and_found.sql  # Full database schema + seed data
└── .env.example        # Environment variable template
```

---

## Notes

- Never commit `.env` — it is gitignored
- If the schema changes, re-run `lost_and_found.sql` to reset your local database
- Passwords are hashed with bcrypt before storage — never stored in plain text

---

## Testing

### 1. Add MySQL to your PATH (macOS, one-time)

If you get `mysql: command not found`, run:

```bash
echo 'export PATH="/usr/local/mysql/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### 2. Create and seed the test database (one-time)

```bash
npm run db:test:setup
```

This creates a separate `lost_found_test` database and applies the full schema including seed data. Re-run this whenever the schema changes.

> Tests never touch `lost_found_db`. The test database is fully isolated.

### 3. Run the tests

```bash
npm test
```

Tests run serially. Each suite seeds its own data and cleans up after itself.

### Test Structure

```
tests/
  auth.test.js          # TC-AUTH-001 to TC-AUTH-008   — Authentication
  items.test.js         # TC-ITEM-001 to TC-ITEM-014   — Item Management & Pagination
  claims.test.js        # TC-CLAIM-001 to TC-CLAIM-010 — Claims & Verification
  upload.test.js        # TC-IMG-001  to TC-IMG-004    — Image Upload
  users.test.js         # TC-USER-001 to TC-USER-003   — User Profile
  helpers/
    db.js               # cleanDb() — removes test data between suites
```

### Notes

- **Email errors during claims tests** — expected. The test environment has no Gmail OAuth2 credentials. Email failures are logged but do not affect test results. (`--silent` can be added to reduce noise)
- **Admin stats tests** — not yet included. Admin stats endpoints are not yet implemented.
