
- Install Postgress

MAC:

brew update

brew install postgresql@16

brew services start postgresql@16


Windows:

https://www.postgresql.org/download/windows/


- Open Postgres Command Line

psql postgres   (MAC)


- Create database user

CREATE ROLE budget_user WITH LOGIN PASSWORD 'password';

ALTER ROLE budget_user CREATEDB;   -- optional but recommended


- Create Database

CREATE DATABASE budget_tracker OWNER budget_user;


- Connect to new data base

\c budget_tracker


- Create tables (paste this)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories ( 
  id SERIAL PRIMARY KEY, 
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
  date TIMESTAMP DEFAULT NOW(), 
  name TEXT NOT NULL, 
  color TEXT NOT NULL, 
  budget NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions ( 
  id SERIAL PRIMARY KEY, 
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
  date TIMESTAMP DEFAULT NOW(), 
  amount NUMERIC(10, 2) NOT NULL, 
  type TEXT NOT NULL, 
  description TEXT, 
  category_id INTEGER REFERENCES categories(id) 
);


- Create .env.local

touch .env.local

and add this to it

DATABASE_URL=postgresql://budget_user:password@localhost:5432/budget_tracker


- start application

npm install

npm run dev

http://localhost:3000



- Done !
