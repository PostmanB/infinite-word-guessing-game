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

- Random five-letter secrets chosen from the bundled CSV list.
- Guess validation against the word list with an animated toast for invalid entries.
- Tile flip animation, duplicate-letter handling, and on-screen keyboard feedback.
- Mobile-friendly layout: board sized for small screens with a fixed bottom keyboard.
- Score persists across rounds until reset.

## Word list

The input CSV is lightly normalised to lowercase words of length five. Replace `public/5_letters.csv` with another list to customise the vocabulary.
