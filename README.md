# Student Manager (React + Node.js + Express + MySQL)

A simple CRUD web app for managing student details.
You can add, view, edit, delete, and search students.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), plain CSS, fetch |
| Backend | Node.js, Express, mysql2, cors, dotenv, nodemon |
| Database | MySQL (managed with phpMyAdmin in XAMPP) |

## Features

- Three kinds of users:
  - **Visitor** (not logged in): can add their own details (name, email, age, and a
    password for logging in later) and see what they added.
  - **Student** (logged in): can see all students and edit only their own details
    (including changing their password).
  - **Admin** (logged in): can add, view, edit, and delete any student, and can set a
    student's password.
- Search students by name
- Passwords are stored as bcrypt hashes; logins use JWT tokens (valid for 1 day)
- Form validation on the frontend and the backend
- Loading states and clear error messages

## Folder structure

```
project/
├── backend/
│   ├── middleware/auth.js   (who is logged in, role checks)
│   ├── routes/auth.js       (login)
│   ├── routes/students.js
│   ├── scripts/create-admin.js
│   ├── .env
│   ├── db.js
│   ├── password.js
│   ├── schema.sql
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/ (Navbar, LoginForm, StudentForm, StudentList, VisitorDetails)
    │   ├── api.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── .env
    └── package.json
```

## Requirements

- Windows with XAMPP installed (Apache and MySQL)
- Node.js 20 or newer (check with `node -v`)

## Setup (first time only)

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open http://localhost/phpmyadmin, click the **SQL** tab, and run the contents of
   `backend/schema.sql`.

   Already have the `crud_db` database from the earlier version? Run this instead
   (your existing students are kept, but cannot log in until a password is set):

```sql
USE crud_db;
ALTER TABLE students ADD COLUMN password_hash VARCHAR(255) NULL;
CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
```

3. Install the backend:

```bash
cd backend
npm install
```

4. Create `backend/.env` (copy `.env.example`):

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=crud_db
CLIENT_URL=http://localhost:5173
JWT_SECRET=<long random text>
```

   Generate a value for `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Create an admin account (run it again with the same email to reset the password):

```bash
npm run create-admin -- admin@example.com YourAdminPassword
```

6. Install the frontend:

```bash
cd ../frontend
npm install
```

7. Create `frontend/.env` (optional; this is the default):

```
VITE_API_URL=http://localhost:5000
```

## Run the app

Use two terminals (MySQL must be running in XAMPP).

Terminal 1, backend:

```bash
cd backend
npm run dev
```

You should see "Connected to MySQL database" and "Server running at http://localhost:5000".

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## API reference

Logged-in requests send the header `Authorization: Bearer <token>`.

| Method | URL | Who | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | /auth/login | anyone | role (student/admin), email, password | 200, token and user | 400, 401, 500 |
| GET | /auth/me | logged in | none | 200, current user | 401 |
| GET | /students | student, admin | none | 200, list of students | 401, 500 |
| POST | /students | visitor (password required), admin (password optional) | name, email, age, password | 201, new student | 400, 401, 403, 500 |
| PUT | /students/:id | admin, or the student themselves | name, email, age, password (optional) | 200, updated student | 400, 401, 403, 404, 500 |
| DELETE | /students/:id | admin | none | 200, message | 400, 401, 403, 404, 500 |

Validation rules: name is required (max 100 characters), email is required,
valid, and unique (max 100 characters), age is optional (whole number 1 to 120),
password is 8 to 72 characters.

## Troubleshooting

| Problem | Fix |
|---|---|
| Could not connect to MySQL | Start MySQL in XAMPP and check `backend/.env` |
| CORS error in the browser | Make `CLIENT_URL` in `backend/.env` match the frontend address, then restart the backend |
| Cannot reach the server | Start the backend and check `VITE_API_URL` in `frontend/.env` |
| Port already in use | Change `PORT` in `backend/.env` (and `VITE_API_URL` to match) |
| `.env` changes ignored | Stop the server and start it again |
| "JWT_SECRET is missing" | Add `JWT_SECRET` to `backend/.env` (see step 4) |
| "Unknown column password_hash" or "admins doesn't exist" | Run the SQL from step 2 for an existing database |
| A student can't log in | They may have no password yet; an admin can set one by editing them |

## Note

The default XAMPP login (root with an empty password) is for local learning only.
Never use it on a real, deployed project.