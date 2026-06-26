"use client";

import { useEffect, useState } from "react";
import { Brain, Eye, EyeOff, RefreshCw } from "lucide-react";
import { turkishRiddles, type TurkishRiddle } from "@/data/turkishRiddles";

function pickRiddle(prev?: TurkishRiddle): TurkishRiddle {
  let r: TurkishRiddle;
  do {
    r = turkishRiddles[Math.floor(Math.random() * turkishRiddles.length)];
  } while (prev && r.riddle === prev.riddle && turkishRiddles.length > 1);
  return r;
}

export function RiddleWidget() {
  const [riddle, setRiddle] = useState<TurkishRiddle | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const newRiddle = () => {
    setShowAnswer(false);
    setRiddle((prev) => pickRiddle(prev ?? undefined));
  };

  useEffect(() => {
    setRiddle(pickRiddle());
  }, []);

  return (
    <div className="riddle-widget">
      <div className="riddle-header">
        <Brain size={15} />
        <span>Bulmaca</span>
      </div>
      {riddle ? (
        <>
          <p className="riddle-q">{riddle.riddle}</p>
          <div className={`riddle-answer-wrap ${showAnswer ? "revealed" : ""}`}>
            <p className="riddle-ans">{riddle.answer}</p>
          </div>
          <div className="riddle-actions">
            <button
              className="riddle-btn"
              onClick={() => setShowAnswer((v) => !v)}
            >
              {showAnswer ? <EyeOff size={12} /> : <Eye size={12} />}
              {showAnswer ? "Gizle" : "Cevap"}
            </button>
            <button className="riddle-btn" onClick={newRiddle}>
              <RefreshCw size={12} />
              Yeni
            </button>
          </div>
        </>
      ) : (
        <p className="riddle-loading">Yükleniyor…</p>
      )}
    </div>
  );
}
