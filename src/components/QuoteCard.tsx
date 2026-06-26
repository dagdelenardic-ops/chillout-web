"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { turkishQuotes } from "@/data/turkishQuotes";

interface QuoteData {
  quote: string;
  author: string;
}

// Atatürk API'den TR söz çek; başarısız olursa statik havuza düş.
async function fetchAtaturkQuote(): Promise<QuoteData | null> {
  try {
    // İlk endpoint redirect ediyor; final URL doğrudan kullanılır.
    const res = await fetch("https://ataturk.vercel.app/tr", {
      // 4 sn timeout için AbortSignal.timeout (modern tarayıcılarda var)
      signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(4000)
        : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.quote) return null;
    return { quote: data.quote, author: "Mustafa Kemal Atatürk" };
  } catch {
    return null;
  }
}

function pickStaticQuote(prev?: QuoteData): QuoteData {
  let q: QuoteData;
  do {
    q = turkishQuotes[Math.floor(Math.random() * turkishQuotes.length)];
  } while (prev && q.quote === prev.quote && turkishQuotes.length > 1);
  return q;
}

export function QuoteCard() {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setVisible(false);

    // %50 olasılıkla Atatürk API, %50 olasılıkla statik havuz; çeşitlilik için.
    let next: QuoteData | null = null;
    if (Math.random() < 0.5) {
      next = await fetchAtaturkQuote();
    }
    if (!next) {
      next = pickStaticQuote(quote ?? undefined);
    }

    setQuote(next);
    setLoading(false);
    setTimeout(() => setVisible(true), 80);
  }, [quote]);

  useEffect(() => {
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="quote-card">
      <span className="quote-mark">&ldquo;</span>
      <div className={`quote-body ${visible ? "quote-visible" : "quote-hidden"}`}>
        {quote ? (
          <>
            <p className="quote-text">{quote.quote}</p>
            <p className="quote-author">— {quote.author}</p>
          </>
        ) : (
          <div className="quote-placeholder">
            <div className="quote-skel-line" />
            <div className="quote-skel-line short" />
          </div>
        )}
      </div>
      <button
        className={`quote-refresh-btn ${loading ? "spinning" : ""}`}
        onClick={fetchQuote}
        title="Yeni söz"
        disabled={loading}
      >
        <RefreshCw size={13} />
      </button>
    </div>
  );
}
