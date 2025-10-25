import { useEffect, useState } from "react";
import type {
  MarketSummary,
  QuoteResult,
  PreparedTransaction,
  BuildSwapExactInResult,
} from "../../src";
import { GteSdk } from "../../src";

const sdk = new GteSdk();

export function App() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [approveTx, setApproveTx] = useState<PreparedTransaction | null>(null);
  const [swapTx, setSwapTx] = useState<BuildSwapExactInResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const fetchedMarkets = await sdk.getMarkets({ limit: 10, marketType: "amm" });
        if (cancelled) return;
        setMarkets(fetchedMarkets);
        const first = fetchedMarkets[0];
        if (first) {
          const q = await sdk.getQuote({
            tokenIn: first.baseToken,
            tokenOut: first.quoteToken,
            amountIn: "0.01",
          });
          if (!cancelled) {
            setQuote(q);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function buildTransactions() {
      if (!quote || !markets[0]) return;
      try {
        const approve = await sdk.buildApprove({ tokenAddress: markets[0].baseToken.address });
        const swap = await sdk.buildSwapExactIn({
          tokenIn: markets[0].baseToken,
          tokenOut: markets[0].quoteToken,
          amountIn: quote.amountIn,
          quote,
          recipient: markets[0].baseToken.address,
        });
        if (!cancelled) {
          setApproveTx(approve);
          setSwapTx(swap);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      }
    }
    buildTransactions();
    return () => {
      cancelled = true;
    };
  }, [quote, markets]);

  if (loading) return <p>Loading GTE markets…</p>;
  if (error) return <p>Failed to load SDK data: {error}</p>;

  return (
    <div>
      <h1>GTE AMM Markets</h1>
      <ul>
        {markets.map((market) => (
          <li key={market.address}>
            {market.baseToken.symbol}/{market.quoteToken.symbol} – ${market.priceUsd}
          </li>
        ))}
      </ul>

      {quote && markets[0] && (
        <section>
          <h2>Quote</h2>
          <p>
            Swapping {quote.amountIn} {markets[0].baseToken.symbol} ≈ {quote.expectedAmountOut} {markets[0].quoteToken.symbol}
          </p>
        </section>
      )}

      {approveTx && swapTx && (
        <section>
          <h2>Prepared Transactions</h2>
          <pre>{JSON.stringify({ approveTx, swapTx }, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
