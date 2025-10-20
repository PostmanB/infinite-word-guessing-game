import React, { useState, useEffect, useRef } from "react";

const MAX_GUESSES = 5;
const WORD_LENGTH = 5;

function evaluateGuess(guess, secret) {
  // two-pass evaluation to handle duplicates properly
  const result = Array(WORD_LENGTH).fill("absent");
  const secretUnused = secret.slice();

  // first pass: greens
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === secret[i]) {
      result[i] = "green";
      secretUnused[i] = null;
    }
  }

  // second pass: yellows
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "green") continue;
    const idx = secretUnused.indexOf(guess[i]);
    if (idx !== -1 && guess[i] !== null) {
      result[i] = "yellow";
      secretUnused[idx] = null;
    }
  }

  return result;
}

export default function App() {
  const [guesses, setGuesses] = useState([]); // array of {word, result}
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [animatingRow, setAnimatingRow] = useState(-1);
  const [words, setWords] = useState([]);
  const [secret, setSecret] = useState("");
  const [secretChars, setSecretChars] = useState([]);
  const [score, setScore] = useState(0);
  const toastTimer = useRef(null);
  const validWordsRef = useRef(new Set());
  function showToast(msg, duration = 1400) {
    setMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), duration);
  }
  const [shake, setShake] = useState(false);

  function addValidWords(list = []) {
    const set = validWordsRef.current;
    list.forEach((w) => {
      if (w && w.length === WORD_LENGTH) set.add(w);
    });
  }

  // keyboard handlers
  function handleKeyClick(letter) {
    if (won) return;
    if (current.length >= WORD_LENGTH) return;
    setCurrent((c) => (c + letter).slice(0, WORD_LENGTH));
  }

  function handleBackspace() {
    if (won) return;
    setCurrent((c) => c.slice(0, -1));
  }

  function handleEnter() {
    if (won) return;
    submitGuess();
  }

  // physical keyboard support
  useEffect(() => {
    function onKey(e) {
      if (won) return;
      const key = e.key;
      if (/^[a-zA-Z]$/.test(key)) {
        // letter
        setCurrent((c) => (c + key.toLowerCase()).slice(0, WORD_LENGTH));
      } else if (key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (key === "Enter") {
        submitGuess();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [won, submitGuess]);

  function submitGuess() {
    const guess = current.trim().toLowerCase();
    if (guess.length !== WORD_LENGTH) {
      showToast("Enter a 5-letter word");
      return;
    }

    // Validate against the loaded word list
    if (validWordsRef.current.size && !validWordsRef.current.has(guess)) {
      showToast("Not a valid word");
      setShake(true);
      setTimeout(() => setShake(false), 360);
      return;
    }

    const result = evaluateGuess(guess.split(""), secretChars);
    const next = { word: guess, result };
    const rowIndex = guesses.length; // index of the row being added
    setAnimatingRow(rowIndex);
    setGuesses((g) => [...g, next]);
    setCurrent("");
    setMessage("");

    // clear animating flag after flip animations finish
    setTimeout(() => setAnimatingRow(-1), WORD_LENGTH * 160 + 300);

    if (guess === secret) {
      // correct: increment score and prepare next random word
      setWon(true);
      setScore((s) => s + 1);
      // after a short delay to show animation, pick next word
      setTimeout(() => {
        pickRandomWord(false);
      }, 900);
    }
  }

  function resetGame() {
    // fully reset score and start a fresh word
    setScore(0);
    setGuesses([]);
    setCurrent("");
    setMessage("");
    setWon(false);
    pickRandomWord(true);
  }

  const correctLetters = Array(WORD_LENGTH).fill("_");
  guesses.forEach((g) => {
    g.word.split("").forEach((ch, i) => {
      if (g.result[i] === "green") correctLetters[i] = ch;
    });
  });

  // compute keyboard key statuses from guesses (green > yellow > absent)
  const keyStatuses = {};
  guesses.forEach((g) => {
    g.word.split("").forEach((ch, i) => {
      const prev = keyStatuses[ch];
      const status = g.result[i];
      if (prev === "green") return; // keep green as highest priority
      if (status === "green") keyStatuses[ch] = "green";
      else if (status === "yellow")
        keyStatuses[ch] = prev === "green" ? "green" : "yellow";
      else if (!prev) keyStatuses[ch] = "absent";
    });
  });

  // pick a random word from the words list; if resetScore true, score will be reset
  function pickRandomWord(resetScore = false) {
    if (!words || words.length === 0) return;
    const idx = Math.floor(Math.random() * words.length);
    const w = words[idx];
    setSecret(w);
    setSecretChars(w.split(""));
    setGuesses([]);
    setCurrent("");
    setMessage("");
    setWon(false);
    setAnimatingRow(-1);
    if (resetScore) setScore(0);
  }

  // load words CSV on mount
  useEffect(() => {
    async function load() {
      validWordsRef.current = new Set();
      let fallbackWords = [];
      try {
        const res = await fetch("/5_letters.csv");
        const txt = await res.text();
        const lines = txt
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        fallbackWords = lines
          .filter((l) => !/^\s*1,2,3,4,5/.test(l))
          .map((l) => l.split(",").join("").toLowerCase())
          .filter((w) => w.length === WORD_LENGTH);
        addValidWords(fallbackWords);
      } catch (err) {
        console.error("failed to load word list", err);
      }

      // Try to fetch full Wordle lists (solutions + allowed guesses)
      let secretPool = fallbackWords;
      try {
        const solutionsRes = await fetch(
          "https://raw.githubusercontent.com/tabatkins/wordle-list/main/solutions"
        );
        if (solutionsRes.ok) {
          const txt = await solutionsRes.text();
          const list = txt
            .split(/\r?\n/)
            .map((w) => w.trim().toLowerCase())
            .filter((w) => w.length === WORD_LENGTH);
          if (list.length) {
            secretPool = list;
            addValidWords(list);
          }
        }
      } catch (err) {
        console.warn("failed to load extended solutions list", err);
      }

      try {
        const allowedRes = await fetch(
          "https://raw.githubusercontent.com/tabatkins/wordle-list/main/words"
        );
        if (allowedRes.ok) {
          const txt = await allowedRes.text();
          const list = txt
            .split(/\r?\n/)
            .map((w) => w.trim().toLowerCase())
            .filter((w) => w.length === WORD_LENGTH);
          addValidWords(list);
        }
      } catch (err) {
        console.warn("failed to load extended allowed list", err);
      }

      if (secretPool.length) {
        setWords(secretPool);
        const idx = Math.floor(Math.random() * secretPool.length);
        const w = secretPool[idx];
        setSecret(w);
        setSecretChars(w.split(""));
      }
    }
    load();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="max-w-3xl w-full flex-1 p-3 sm:p-6 pb-32 sm:pb-6 bg-transparent sm:bg-gradient-to-b sm:from-white/2 sm:to-white/1 sm:rounded-xl mx-auto mt-2 sm:mt-12 text-slate-100 font-sans">
      <div className="hidden sm:flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Infi-Wordle</h1>
        <div className="text-sm text-slate-300">
          Score: <span className="font-bold text-white">{score}</span>
        </div>
      </div>

      {/* board + keyboard share same content width (keyboard determines width) */}
      <div className="w-full mx-auto mb-3">
        <div className="flex flex-col gap-1 sm:gap-2 md:gap-3 w-[92vw] max-w-[560px] mx-auto px-1 sm:px-0">
          {guesses.map((g, row) => (
            <div className="flex gap-1 sm:gap-2 md:gap-3 w-full" key={row}>
              {g.word.split("").map((ch, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${i * 150}ms` }}
                  className={`select-none flex-1 aspect-square flex items-center justify-center rounded-md text-2xl sm:text-3xl leading-none font-bold text-white transform preserve-3d tile ${
                    g.result[i] === "green"
                      ? "bg-emerald-600"
                      : g.result[i] === "yellow"
                      ? "bg-amber-500"
                      : "bg-slate-700"
                  } ${animatingRow === row ? "flip" : ""}`}
                >
                  {ch.toUpperCase()}
                </div>
              ))}
            </div>
          ))}

          {guesses.length < MAX_GUESSES && !won && (
            <div
              className={`flex gap-1 sm:gap-2 md:gap-3 w-full items-center mt-2 ${
                shake ? "shake" : ""
              }`}
            >
              {Array.from({ length: WORD_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className="select-none flex-1 aspect-square flex items-center justify-center rounded-md text-2xl sm:text-3xl leading-none font-bold border border-slate-700 bg-slate-900 text-white"
                >
                  {current[i] ? current[i].toUpperCase() : ""}
                </div>
              ))}
            </div>
          )}

          {Array.from({
            length: Math.max(
              0,
              MAX_GUESSES -
                guesses.length -
                (guesses.length < MAX_GUESSES ? 1 : 0)
            ),
          }).map((_, i) => (
            <div
              className="flex gap-1 sm:gap-2 md:gap-3 w-full"
              key={`empty-${i}`}
            >
              {Array.from({ length: WORD_LENGTH }).map((_, j) => (
                <div
                  className="flex-1 aspect-square bg-slate-900 rounded-md border border-slate-700"
                  key={j}
                ></div>
              ))}
            </div>
          ))}

          {/* On-screen keyboard (fixed on mobile) */}
          <div className="mt-2 sm:mt-4 fixed sm:static bottom-0 left-0 right-0 z-10 border-t border-slate-800 bg-slate-900/95 sm:border-0 sm:bg-transparent">
            <div className="w-[92vw] max-w-[560px] mx-auto px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-0 sm:pt-0 sm:pb-0">
              {[
                "qwertyuiop".split(""),
                "asdfghjkl".split(""),
                ["enter", ..."zxcvbnm".split(""), "backspace"],
              ].map((row, rIdx) => (
                <div
                  key={rIdx}
                  className="flex justify-center gap-1 sm:gap-2 mb-2"
                >
                  {row.map((k) => {
                    const isSpecial = k === "enter" || k === "backspace";
                    const status = !isSpecial ? keyStatuses[k] : undefined;
                    let bg = "bg-gray-500"; // default key color like Wordle
                    if (status === "green") bg = "bg-emerald-600";
                    else if (status === "yellow") bg = "bg-amber-500";
                    else if (status === "absent") bg = "bg-slate-700";

                    const width = isSpecial
                      ? "w-16 sm:w-20 md:w-24"
                      : "w-9 sm:w-10 md:w-12";

                    return (
                      <button
                        key={k}
                        onClick={() =>
                          k === "enter"
                            ? handleEnter()
                            : k === "backspace"
                            ? handleBackspace()
                            : handleKeyClick(k)
                        }
                        className={`${bg} ${width} h-10 sm:h-11 rounded-md text-sm sm:text-base font-semibold text-white select-none active:scale-95 transition-transform flex items-center justify-center shadow-key`}
                      >
                        {k === "enter"
                          ? "ENTER"
                          : k === "backspace"
                          ? "⌫"
                          : k.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="toast bg-slate-800/95 text-white text-sm font-medium px-3 py-2 rounded-md shadow-lg">
            {message}
          </div>
        </div>
      )}

      {won && (
        <div className="mt-3">
          <strong className="block text-lg">You win!</strong>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => pickRandomWord(false)}
              className="px-3 py-2 rounded-md bg-emerald-500 text-slate-900 font-semibold"
            >
              Next word
            </button>
            <button
              onClick={resetGame}
              className="px-3 py-2 rounded-md bg-slate-700 text-white"
            >
              New game (reset score)
            </button>
          </div>
        </div>
      )}

      {!won && guesses.length >= MAX_GUESSES && (
        <div className="mt-3">
          <div className="mb-2">
            Out of guesses. The word was <strong>{secret}</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => pickRandomWord(true)}
              className="px-3 py-2 rounded-md bg-amber-500 text-slate-900 font-semibold"
            >
              New word (reset score)
            </button>
            <button
              onClick={() => pickRandomWord(false)}
              className="px-3 py-2 rounded-md bg-slate-700 text-white"
            >
              Try another word (keep score)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
