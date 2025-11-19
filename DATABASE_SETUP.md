
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

-- Optional for future features
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  occurred_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);






- Create .env.local

touch .env.local

(add this)

DATABASE_URL=postgresql://budget_user:password@localhost:5432/budget_tracker




- start application

npm install
npm run dev

http://localhost:3000



- Done !
