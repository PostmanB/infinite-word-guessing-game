# React Wordle UI

A Wordle-style experience built with Vite + React. The game pulls random five-letter words from `public/5_letters.csv`, validates guesses against the same list, and keeps score across rounds.

## Quick start (PowerShell)

```powershell
cd d:/Work/react-wordle-ui
npm install
npm run dev
```

Open http://localhost:5173 to play.

## Features

- Random five-letter secrets chosen from the Wordle solutions list (falls back to the bundled CSV if offline).
- Guess validation against the merged Wordle solution + allowed guess lists with an animated toast for invalid entries.
- Tile flip animation, duplicate-letter handling, and on-screen keyboard feedback.
- Mobile-friendly layout: board sized for small screens with a fixed bottom keyboard.
- Score persists across rounds until reset.

## Word list

The app fetches the public Wordle solution and allowed-guess lists from [tabatkins/wordle-list](https://github.com/tabatkins/wordle-list). If the network fetch fails, it falls back to normalising `public/5_letters.csv`. Replace or extend that CSV to customise the offline vocabulary.
