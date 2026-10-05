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

- Create: add a student (name, email, age)
- Read: see all students in a table
- Update: edit a student's details
- Delete: remove a student after a confirmation prompt
- Search students by name
- Form validation on the frontend and the backend
- Loading states and clear error messages

## Folder structure

```
project/
├── backend/
│   ├── routes/students.js
│   ├── .env
│   ├── db.js
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/ (Navbar, StudentForm, StudentList)
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
2. Open http://localhost/phpmyadmin, click the **SQL** tab, run:

```sql
CREATE DATABASE IF NOT EXISTS crud_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE crud_db;

CREATE TABLE IF NOT EXISTS students (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  age   INT NULL
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
```

5. Install the frontend:

```bash
cd ../frontend
npm install
```

6. Create `frontend/.env`:

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

| Method | URL | Body | Success | Errors |
|---|---|---|---|---|
| GET | /students | none | 200, list of students | 500 |
| POST | /students | name, email, age | 201, new student | 400, 500 |
| PUT | /students/:id | name, email, age | 200, updated student | 400, 404, 500 |
| DELETE | /students/:id | none | 200, message | 400, 404, 500 |

Validation rules: name is required (max 100 characters), email is required,
valid, and unique (max 100 characters), age is optional (whole number 1 to 120).

## Troubleshooting

| Problem | Fix |
|---|---|
| Could not connect to MySQL | Start MySQL in XAMPP and check `backend/.env` |
| CORS error in the browser | Make `CLIENT_URL` in `backend/.env` match the frontend address, then restart the backend |
| Cannot reach the server | Start the backend and check `VITE_API_URL` in `frontend/.env` |
| Port already in use | Change `PORT` in `backend/.env` (and `VITE_API_URL` to match) |
| `.env` changes ignored | Stop the server and start it again |

## Note

The default XAMPP login (root with an empty password) is for local learning only.
Never use it on a real, deployed project.