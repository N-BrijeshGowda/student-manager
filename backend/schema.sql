-- Full database setup for a fresh install.
-- Run this in phpMyAdmin (SQL tab) or with: mysql -u root < schema.sql

CREATE DATABASE IF NOT EXISTS crud_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE crud_db;

-- password_hash is NULL for students who cannot log in yet
-- (for example, a student added by an admin without a password).
CREATE TABLE IF NOT EXISTS students (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  age           INT NULL,
  password_hash VARCHAR(255) NULL
) ENGINE=InnoDB;

-- Admin accounts are created with: npm run create-admin -- <email> <password>
CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
