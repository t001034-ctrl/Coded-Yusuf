"use client";

import { useCallback, useEffect, useState } from "react";
import { LETTERS, QUESTIONS } from "./questions";
import { ensureCtx, playCheer, playGroan } from "./audio";

const TIME_LIMIT = 15;

type Screen = "start" | "quiz" | "results";

function resultMessage(score: number): string {
  if (score === 10) return "Century! A flawless innings.";
  if (score >= 8) return "Top of the order — superb knock!";
  if (score >= 6) return "A solid partnership at the crease.";
  if (score >= 4) return "Held the bat — but the spin got tricky.";
  if (score >= 2) return "Tail-ender effort — back to the nets!";
  return "Golden duck. Pad up and try again!";
}

export default function CricketQuiz() {
  const [screen, setScreen] = useState<Screen>("start");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [selected, setSelected] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const question = QUESTIONS[currentIdx];
  const locked = selected !== null || timedOut;
  const isLast = currentIdx === QUESTIONS.length - 1;

  // Countdown timer — only ticks while quiz is live and unanswered.
  useEffect(() => {
    if (screen !== "quiz") return;
    if (locked) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      playGroan();
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [screen, locked, timeLeft]);

  const startQuiz = useCallback(() => {
    // First user gesture — unlock AudioContext.
    ensureCtx();
    setCurrentIdx(0);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setSelected(null);
    setTimedOut(false);
    setScreen("quiz");
  }, []);

  const handleAnswer = useCallback(
    (idx: number) => {
      if (locked) return;
      setSelected(idx);
      if (idx === question.answer) {
        setScore((s) => s + 1);
        playCheer();
      } else {
        playGroan();
      }
    },
    [locked, question.answer],
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      setScreen("results");
      return;
    }
    setCurrentIdx((i) => i + 1);
    setTimeLeft(TIME_LIMIT);
    setSelected(null);
    setTimedOut(false);
  }, [isLast]);

  const playAgain = useCallback(() => {
    setCurrentIdx(0);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setSelected(null);
    setTimedOut(false);
    setScreen("quiz");
  }, []);

  const progressPct =
    screen === "results"
      ? 100
      : screen === "quiz"
        ? (currentIdx / QUESTIONS.length) * 100
        : 0;

  return (
    <main className="app">
      <header className="header">
        <div className="title">
          <span className="ball" aria-hidden="true" />
          Cricket Trivia
        </div>
        <div className="stats">
          <div className="pill">Score: {score}</div>
          <div className="pill">
            Q {Math.min(currentIdx + 1, QUESTIONS.length)} / {QUESTIONS.length}
          </div>
          <div className={`pill timer${timeLeft <= 5 && screen === "quiz" ? " warn" : ""}`}>
            {timeLeft}s
          </div>
        </div>
      </header>

      <div className="progress">
        <span style={{ width: `${progressPct}%` }} />
      </div>

      {screen === "start" && (
        <section className="start-screen">
          <h2>Ready to face the spin?</h2>
          <p>10 questions. 15 seconds each. One innings — make it count.</p>
          <div className="pitch-stripe" aria-hidden="true" />
          <button className="start-btn" type="button" onClick={startQuiz}>
            Start Quiz
          </button>
        </section>
      )}

      {screen === "quiz" && (
        <section>
          <div className="question">{question.q}</div>
          <div className="options">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.answer;
              const showCorrect = locked && isCorrect;
              const showWrong = selected === i && !isCorrect;
              const className = `option${showCorrect ? " correct" : ""}${
                showWrong ? " wrong" : ""
              }`;
              return (
                <button
                  key={i}
                  type="button"
                  className={className}
                  disabled={locked}
                  onClick={() => handleAnswer(i)}
                >
                  <span className="badge">{LETTERS[i]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          <Feedback
            locked={locked}
            selected={selected}
            timedOut={timedOut}
            answer={question.answer}
            answerText={question.options[question.answer]}
          />

          {locked && (
            <button className="next-btn" type="button" onClick={handleNext}>
              {isLast ? "See Results" : "Next"}
            </button>
          )}
        </section>
      )}

      {screen === "results" && (
        <section className="results">
          <h2>Innings Complete!</h2>
          <div className="pitch-stripe" aria-hidden="true" />
          <div className="score-big">
            {score}
            <small> / {QUESTIONS.length}</small>
          </div>
          <div className="results-msg">{resultMessage(score)}</div>
          <button className="play-again-btn" type="button" onClick={playAgain}>
            Play Again
          </button>
        </section>
      )}
    </main>
  );
}

function Feedback({
  locked,
  selected,
  timedOut,
  answer,
  answerText,
}: {
  locked: boolean;
  selected: number | null;
  timedOut: boolean;
  answer: number;
  answerText: string;
}) {
  if (!locked) return <div className="feedback" />;

  if (timedOut) {
    return (
      <div className="feedback wrong">
        Time up! Answer: {LETTERS[answer]}) {answerText}
      </div>
    );
  }
  if (selected === answer) {
    return <div className="feedback correct">Howzat! Correct.</div>;
  }
  return (
    <div className="feedback wrong">
      Bowled out! Answer: {LETTERS[answer]}) {answerText}
    </div>
  );
}
