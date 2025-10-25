# GTE TypeScript SDK (MegaETH Testnet)

A lightweight React-friendly TypeScript SDK that mirrors the [`gte-python-sdk`](https://github.com/liquid-labs-inc/gte-python-sdk) surface needed for AMM swaps on MegaETH testnet. It wraps the public REST API plus minimal on-chain helpers so a dApp can fetch markets, price tokens, and build approval/swap transactions that follow Uniswap/PancakeSwap v2 conventions.

## Features
- ✅ Network config helper (`getChainConfig`) derived from the Python SDK/testnet docs.
- ✅ Typed REST client for `/markets`, `/tokens`, and `/markets/{id}/{book|trades|candles}` (pairs, TVL, prices, orderbooks, trades, candles).
- ✅ Portfolio endpoint (`/users/{address}/portfolio`) to render wallet balances in USD.
- ✅ On-chain quoting via the MegaETH Uniswap v2 router (`getQuote`, `getQuoteExactOut`).
- ✅ Transaction builders for ERC-20 approvals and swap flows (`buildApprove`, `buildSwapExactIn`, `buildSwapExactOut`).
- ✅ Works in React (fetch + viem under the hood) with examples in `examples/`.

## Installation
```bash
npm install gte-typescript-sdk
# or when working locally
npm install
npm run build
```

## Quick start
```ts
import { GteSdk } from "gte-typescript-sdk";

const sdk = new GteSdk();
const config = sdk.getChainConfig();
const [market] = await sdk.getMarkets({ marketType: "amm", limit: 1 });

const quote = await sdk.getQuote({
  tokenIn: market.baseToken,
  tokenOut: market.quoteToken,
  amountIn: "0.25", // human-readable units
});

const approveTx = await sdk.buildApprove({
  tokenAddress: market.baseToken.address,
});

const { tx: swapTx } = await sdk.buildSwapExactIn({
  tokenIn: market.baseToken,
  tokenOut: market.quoteToken,
  amountIn: "0.25",
  quote,
  recipient: "0xYourWallet",
});

const quoteOut = await sdk.getQuoteExactOut({
  tokenIn: market.baseToken,
  tokenOut: market.quoteToken,
  amountOut: "1",
});

const { tx: swapExactOutTx } = await sdk.buildSwapExactOut({
  tokenIn: market.baseToken,
  tokenOut: market.quoteToken,
  amountOut: "1",
  quote: quoteOut,
  recipient: "0xYourWallet",
  useNativeIn: true, // optional: native ETH in/out supported when path touches WETH
});

const portfolio = await sdk.getUserPortfolio("0xYourWallet");
console.log(portfolio.totalUsdBalance);
```
Each builder returns the `to`, `data`, and `value` payload ready to hand to wagmi/ethers/viem for signing.

> **Heads up on CORS:** The public MegaETH endpoints do not send permissive CORS headers, so direct browser calls to `https://api-testnet.gte.xyz` will fail (`TypeError: Failed to fetch`). Consume this SDK from a Next.js API route/server component, a custom proxy, or any Node backend. Forward the data/transactions to your React UI rather than instantiating `GteSdk` in the browser.

### Native ETH swaps
If you want to send or receive native ETH, pass `useNativeIn` and/or `useNativeOut` to `buildSwapExactIn` **and** ensure your quote path starts/ends with the wrapped native token (`config.wethAddress`).

## Examples
- `examples/basic.ts` – Node script mirroring `examples/uniswap_swap.py` from the Python SDK.
- `examples/react/App.tsx` – React component showing how to fetch markets, render a quote, and preview the approval/swap payloads inside DeOperator-style flows.

Run the Node example after building:
```bash
npm run build
node --loader ts-node/esm examples/basic.ts
```

## API surface
| Method | Description |
| --- | --- |
| `getChainConfig()` | Returns the MegaETH testnet config + router/WETH addresses. |
| `getMarkets(params)` | Calls `/markets` using the official OpenAPI spec. |
| `getTokens(params)` / `getToken(address)` | Fetch token metadata from `/tokens` and `/tokens/{address}`. |
| `getMarket(address)` | Fetch a single market. |
| `getMarketTrades(address, params)` | Returns `/markets/{market}/trades`. |
| `getMarketOrderBook(address, limit?)` | Returns `/markets/{market}/book`. |
| `getMarketCandles(address, params)` | Returns `/markets/{market}/candles`. |
| `getUserPortfolio(address)` | Returns balances + USD valuations for a wallet from `/users/{address}/portfolio`. |
| `getQuote({ tokenIn, tokenOut, amountIn, slippageBps })` | Reads `getAmountsOut` from the Uniswap v2 router to provide amount + price. |
| `getQuoteExactOut({ tokenIn, tokenOut, amountOut, slippageBps })` | Reads `getAmountsIn` for exact-out pricing. |
| `buildApprove({ tokenAddress, spender?, amount? })` | Encodes an ERC-20 approval; defaults to max approval for the MegaETH AMM router. |
| `buildSwapExactIn({ tokenIn, tokenOut, amountIn, recipient, quote?, deadlineSeconds?, useNativeIn?, useNativeOut? })` | Builds the [`swapExact*`](https://docs.gte.xyz/sdk-reference/python-sdk) transaction matching the Python reference implementation. |
| `buildSwapExactOut({ tokenIn, tokenOut, amountOut, recipient, quote?, deadlineSeconds?, useNativeIn?, useNativeOut? })` | Builds the exact-output counterparts (`swap*ForExact*`). |

See `src/sdk.ts` for more detail; all behavior was ported directly from `clients/execution` in the Python repo.

## Development
```bash
npm install
npm run build
```

The SDK is dependency-light (only `viem`), fully typed, and ready to publish or consume in a React bundler without extra shims.
