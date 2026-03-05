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

Use packages such as Axios to interact with back-end API endpoints within React code. E.G.
```
const [items, setItems] = useState([]);
useEffect(() => {
    const fetchAllItems = async () => {
        try {
            const res = await axios.get("http://localhost:3000/items");
            setItems(res.data);
        } catch(e) {
            console.log(e);
        }
    }
    fetchAllItems();
})
```
Back-end server needs to be run seperately from front-end server

## API Endpoints Already Setup

### Auth

| Method | Endpoint        | Description       |
|--------|-----------------|-------------------|
| `POST` | `/api/auth/login`    | Login users     |
| `POST` | `/api/auth/logout`    | Logout users     |


### Users

| Method | Endpoint        | Description       |
|--------|-----------------|-------------------|
| `GET` | `/api/users`    | Get all users     |
| `GET` | `/api/users/:id` | Get user by ID    |
| `POST` | `/api/users`    | Create a new user |
| `PUT` | `/api/users/:id` | Update a user     |


### Admin
| `GET` | `/api/admin/:id` | View admin page   |





> Accounts registered with a `@georgebrown.ca` email are automatically marked as verified members.

```
admin account set up
email: admin@georgebrown.ca
password: 1234
```

---

## Project Structure

```
├── index.js          # Entry point, server setup
├── db.js             # MySQL connection pool
├── routes/           # Route definitions
├── controllers/      # Request handling & business logic
├── models/           # Database queries
├── lost_and_found.sql  # Full database schema + seed data
└── .env.example      # Environment variable template
```

---

## Notes

- Never commit `.env` — it is gitignored
- If the schema changes, re-run `lost_and_found.sql` to reset your local database
- Passwords are hashed with bcrypt before storage — never stored in plain text
