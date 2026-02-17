# Start app

- Install Node.js on your computer, it should have NPM.js with it
- Unzip the zipped folder with this README
- Go to a terminal either built in the computer or in an IDE like VSCode
- If wanting a new next project, do that first with `If making a new next project` then come back
- Go to the main folder (`budget` or similar)
- Create a file called .env.local with a file system or `touch .env.local`
- Get an API key for ChatGPT and include it in `.env.local` as `NEXT_PUBLIC_OPENAI_API_KEY={api_key}`
- Go through the PostgreSQL process in DATABASE_SETUP, include url in `.env.local` as `DATABASE_URL=postgresql://{owner}:{password}@localhost:5432/budget_tracker`
- In the terminal (or another if needed), at the main folder, install dependencies with `npm install` or `sudo npm install` (protected root)
- Launch localhost with `npm run dev` or `sudo npm run dev` (protected root)



## If making a new next project (or if other option above doesn't work)

- Make a new next project in a parent folder with `npx create-next-app@latest` with a name like `budget`
    - Pick `No, customize settings`
    - Enable TypeScript, ESLint, Tailwind CSS, use `src/` directory (all default expect `src/`)
- Replace `package.json` with the one in the former zip folder
- Same thing with `src/`