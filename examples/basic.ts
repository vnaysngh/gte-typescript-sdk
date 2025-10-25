import { GteSdk } from "../src";

async function main() {
  const sdk = new GteSdk();
  const [firstMarket] = await sdk.getMarkets({ limit: 1, marketType: "amm" });
  if (!firstMarket) {
    throw new Error("No AMM markets returned by the API");
  }

  const quote = await sdk.getQuote({
    tokenIn: firstMarket.baseToken,
    tokenOut: firstMarket.quoteToken,
    amountIn: "0.01",
  });

  const approveTx = await sdk.buildApprove({
    tokenAddress: firstMarket.baseToken.address,
  });

  const { tx: swapTx } = await sdk.buildSwapExactIn({
    tokenIn: firstMarket.baseToken,
    tokenOut: firstMarket.quoteToken,
    amountIn: "0.01",
    recipient: firstMarket.baseToken.address,
    quote,
  });

  console.log("Quote", quote);
  console.log("Approve transaction", approveTx);
  console.log("Swap transaction", swapTx);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
