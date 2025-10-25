import { describe, expect, it } from "vitest";
import { decodeFunctionData, parseUnits, type Address, type PublicClient } from "viem";

import { GteSdk, MEGAETH_TESTNET_CHAIN_CONFIG } from "../src";
import { ERC20_ABI, UNISWAP_V2_ROUTER_ABI } from "../src/constants";
import type {
  MarketSummary,
  QuoteExactOutResult,
  QuoteResult,
  TokenSummary,
  UserPortfolio,
} from "../src/types";

const MOCK_ROUTER = "0x86470efcEa37e50F94E74649463b737C87ada367" as Address;
const BASE_TOKEN: TokenSummary = {
  address: "0x0000000000000000000000000000000000000b01" as Address,
  decimals: 18,
  name: "Base",
  symbol: "BASE",
};
const QUOTE_TOKEN: TokenSummary = {
  address: "0x0000000000000000000000000000000000000c01" as Address,
  decimals: 18,
  name: "Quote",
  symbol: "QUOTE",
};

const WETH_TOKEN: TokenSummary = {
  address: MEGAETH_TESTNET_CHAIN_CONFIG.wethAddress,
  decimals: 18,
  name: "Wrapped ETH",
  symbol: "WETH",
};

const MOCK_MARKET: MarketSummary = {
  marketType: "amm",
  address: "0x0000000000000000000000000000000000000d01" as Address,
  baseToken: BASE_TOKEN,
  quoteToken: QUOTE_TOKEN,
  price: "1",
  priceUsd: "1",
  volume24HrUsd: "100",
  volume1HrUsd: "10",
  marketCapUsd: "1000",
  createdAt: Date.now(),
  tvlUsd: "500",
};

const MOCK_PORTFOLIO: UserPortfolio = {
  tokens: [
    {
      token: BASE_TOKEN,
      balance: "1",
      balanceUsd: "2000",
      realizedPnlUsd: "0",
      unrealizedPnlUsd: "0",
    },
  ],
  totalUsdBalance: "2000",
};

const MOCK_TOKENS = [BASE_TOKEN, QUOTE_TOKEN];

const MOCK_TRADE = {
  price: "2000",
  size: "0.1",
  side: "buy" as const,
  timestamp: Date.now(),
};

const MOCK_ORDERBOOK = {
  bids: [{ price: "1999", size: "1" }],
  asks: [{ price: "2001", size: "1" }],
};

const MOCK_CANDLES = [
  { timestamp: 1, open: "1", high: "2", low: "1", close: "2", volume: "10", numTrades: 5 },
];

const DEFAULT_RESPONSES: Record<string, unknown> = {
  "/markets": [MOCK_MARKET],
  [`/markets/${MOCK_MARKET.address}`]: MOCK_MARKET,
  "/tokens": MOCK_TOKENS,
  [`/tokens/${BASE_TOKEN.address}`]: BASE_TOKEN,
  [`/markets/${MOCK_MARKET.address}/trades`]: [MOCK_TRADE],
  [`/markets/${MOCK_MARKET.address}/book`]: MOCK_ORDERBOOK,
  [`/markets/${MOCK_MARKET.address}/candles`]: MOCK_CANDLES,
};

const noopFetch = makeFetch();
const noopPublicClient = createPublicClientMock(async () => {
  throw new Error("readContract should not be called");
});

describe("GteSdk", () => {
  it("fetches markets via REST", async () => {
    const sdk = new GteSdk({
      restOptions: {
        baseUrl: "https://mock.gte",
        fetchImpl: makeFetch(),
      },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const markets = await sdk.getMarkets({ limit: 1 });
    expect(markets).toHaveLength(1);
    expect(markets[0].address).toBe(MOCK_MARKET.address);
    expect(markets[0].baseToken.symbol).toBe("BASE");
  });

  it("exposes token/market/trade/orderbook endpoints", async () => {
    const sdk = new GteSdk({
      restOptions: {
        baseUrl: "https://mock.gte",
        fetchImpl: makeFetch(),
      },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const tokens = await sdk.getTokens();
    expect(tokens.length).toBeGreaterThan(1);
    const token = await sdk.getToken(BASE_TOKEN.address);
    expect(token.address).toBe(BASE_TOKEN.address);

    const market = await sdk.getMarket(MOCK_MARKET.address);
    expect(market.address).toBe(MOCK_MARKET.address);

    const trades = await sdk.getMarketTrades(MOCK_MARKET.address, { limit: 1 });
    expect(trades[0].side).toBe("buy");

    const book = await sdk.getMarketOrderBook(MOCK_MARKET.address, 5);
    expect(book.bids).toHaveLength(1);

    const candles = await sdk.getMarketCandles(MOCK_MARKET.address, {
      interval: "1m",
      startTime: 0,
      limit: 1,
    });
    expect(candles[0].open).toBe("1");
  });

  it("quotes swaps using the Uniswap router", async () => {
    const amountInAtomic = parseUnits("1", 18);
    const amountsOut = [amountInAtomic, parseUnits("2", 18)];
    const calls: string[] = [];
    const publicClient = createPublicClientMock(async (args) => {
      calls.push(args.functionName as string);
      if (args.functionName === "getAmountsOut") {
        return amountsOut;
      }
      throw new Error(`Unexpected function ${String(args.functionName)}`);
    });

    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const quote = await sdk.getQuote({
      tokenIn: BASE_TOKEN,
      tokenOut: QUOTE_TOKEN,
      amountIn: "1",
    });

    expect(calls).toContain("getAmountsOut");
    expect(quote.amountInAtomic).toBe(amountInAtomic);
    expect(quote.expectedAmountOutAtomic).toBe(amountsOut[1]);
    expect(quote.minAmountOutAtomic).toBe((amountsOut[1] * 9950n) / 10000n);
  });

  it("quotes exact-out swaps using the Uniswap router", async () => {
    const amountOutAtomic = parseUnits("1", 18);
    const amountsIn = [parseUnits("0.5", 18), amountOutAtomic];
    const publicClient = createPublicClientMock(async (args) => {
      if (args.functionName === "getAmountsIn") {
        return amountsIn;
      }
      throw new Error(`Unexpected function ${String(args.functionName)}`);
    });

    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const quote = await sdk.getQuoteExactOut({
      tokenIn: BASE_TOKEN,
      tokenOut: QUOTE_TOKEN,
      amountOut: "1",
    });

    expect(quote.amountOutAtomic).toBe(amountOutAtomic);
    expect(quote.expectedAmountInAtomic).toBe(amountsIn[0]);
    expect(quote.maxAmountInAtomic).toBe((amountsIn[0] * 10050n) / 10000n);
  });

  it("builds token approvals that target the router by default", async () => {
    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const approval = await sdk.buildApprove({
      tokenAddress: BASE_TOKEN.address,
      amount: "5",
      decimals: BASE_TOKEN.decimals,
    });

    expect(approval.to).toBe(BASE_TOKEN.address);
    const decoded = decodeFunctionData({ abi: ERC20_ABI, data: approval.data });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args?.[0]).toBe(MOCK_ROUTER);
  });

  it("builds swapExactIn payloads using the provided quote", async () => {
    const quote: QuoteResult = {
      amountIn: "1",
      amountInAtomic: parseUnits("1", 18),
      expectedAmountOut: "2",
      expectedAmountOutAtomic: parseUnits("2", 18),
      minAmountOut: "1.99",
      minAmountOutAtomic: (parseUnits("2", 18) * 9950n) / 10000n,
      price: "2",
      slippageBps: 50,
      path: [BASE_TOKEN.address, QUOTE_TOKEN.address],
    };

    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const { tx, deadline } = await sdk.buildSwapExactIn({
      tokenIn: BASE_TOKEN,
      tokenOut: QUOTE_TOKEN,
      amountIn: "1",
      recipient: "0x0000000000000000000000000000000000000f01" as Address,
      quote,
    });

    expect(tx.to).toBe(MOCK_ROUTER);
    expect(BigInt(deadline)).toBeGreaterThan(BigInt(Math.floor(Date.now() / 1000)) - 1n);
    const decoded = decodeFunctionData({ abi: UNISWAP_V2_ROUTER_ABI, data: tx.data });
    expect(decoded.functionName).toBe("swapExactTokensForTokens");
    expect(decoded.args?.[0]).toBe(quote.amountInAtomic);
    expect(decoded.args?.[1]).toBe(quote.minAmountOutAtomic);
    const decodedPath = (decoded.args?.[2] as string[]).map((addr) => addr.toLowerCase());
    const quotePath = quote.path.map((addr) => addr.toLowerCase());
    expect(decodedPath).toEqual(quotePath);
  });

  it("supports native input/output for swapExactIn", async () => {
    const wethQuote: QuoteResult = {
      amountIn: "1",
      amountInAtomic: parseUnits("1", 18),
      expectedAmountOut: "2",
      expectedAmountOutAtomic: parseUnits("2", 18),
      minAmountOut: "1.99",
      minAmountOutAtomic: (parseUnits("2", 18) * 9950n) / 10000n,
      price: "2",
      slippageBps: 50,
      path: [WETH_TOKEN.address, QUOTE_TOKEN.address],
    };

    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const { tx: nativeInTx } = await sdk.buildSwapExactIn({
      tokenIn: WETH_TOKEN,
      tokenOut: QUOTE_TOKEN,
      amountIn: "1",
      recipient: "0x0000000000000000000000000000000000000f01" as Address,
      quote: wethQuote,
      useNativeIn: true,
    });
    const decodedIn = decodeFunctionData({ abi: UNISWAP_V2_ROUTER_ABI, data: nativeInTx.data });
    expect(decodedIn.functionName).toBe("swapExactETHForTokens");
    expect(nativeInTx.value).toBe(wethQuote.amountInAtomic);

    const { tx: nativeOutTx } = await sdk.buildSwapExactIn({
      tokenIn: BASE_TOKEN,
      tokenOut: WETH_TOKEN,
      amountIn: "1",
      recipient: "0x0000000000000000000000000000000000000f01" as Address,
      quote: {
        ...wethQuote,
        path: [BASE_TOKEN.address, WETH_TOKEN.address],
      },
      useNativeOut: true,
    });
    const decodedOut = decodeFunctionData({ abi: UNISWAP_V2_ROUTER_ABI, data: nativeOutTx.data });
    expect(decodedOut.functionName).toBe("swapExactTokensForETH");
  });

  it("builds swapExactOut payloads using the provided quote", async () => {
    const quote: QuoteExactOutResult = {
      amountOut: "1",
      amountOutAtomic: parseUnits("1", 18),
      expectedAmountIn: "0.5",
      expectedAmountInAtomic: parseUnits("0.5", 18),
      maxAmountIn: "0.505",
      maxAmountInAtomic: (parseUnits("0.5", 18) * 10050n) / 10000n,
      price: "2",
      slippageBps: 50,
      path: [BASE_TOKEN.address, QUOTE_TOKEN.address],
    };

    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const { tx } = await sdk.buildSwapExactOut({
      tokenIn: BASE_TOKEN,
      tokenOut: QUOTE_TOKEN,
      amountOut: "1",
      recipient: "0x0000000000000000000000000000000000000f01" as Address,
      quote,
    });

    const decoded = decodeFunctionData({ abi: UNISWAP_V2_ROUTER_ABI, data: tx.data });
    expect(decoded.functionName).toBe("swapTokensForExactTokens");
    expect(decoded.args?.[0]).toBe(quote.amountOutAtomic);
    expect(decoded.args?.[1]).toBe(quote.maxAmountInAtomic);
  });

  it("supports native input/output for swapExactOut", async () => {
    const quote: QuoteExactOutResult = {
      amountOut: "1",
      amountOutAtomic: parseUnits("1", 18),
      expectedAmountIn: "0.5",
      expectedAmountInAtomic: parseUnits("0.5", 18),
      maxAmountIn: "0.505",
      maxAmountInAtomic: (parseUnits("0.5", 18) * 10050n) / 10000n,
      price: "2",
      slippageBps: 50,
      path: [WETH_TOKEN.address, QUOTE_TOKEN.address],
    };

    const sdk = new GteSdk({
      restOptions: { baseUrl: "https://mock.gte", fetchImpl: noopFetch },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const { tx: nativeInTx } = await sdk.buildSwapExactOut({
      tokenIn: WETH_TOKEN,
      tokenOut: QUOTE_TOKEN,
      amountOut: "1",
      recipient: "0x0000000000000000000000000000000000000f01" as Address,
      quote,
      useNativeIn: true,
    });
    const decodedIn = decodeFunctionData({ abi: UNISWAP_V2_ROUTER_ABI, data: nativeInTx.data });
    expect(decodedIn.functionName).toBe("swapETHForExactTokens");
    expect(nativeInTx.value).toBe(quote.maxAmountInAtomic);

    const { tx: nativeOutTx } = await sdk.buildSwapExactOut({
      tokenIn: BASE_TOKEN,
      tokenOut: WETH_TOKEN,
      amountOut: "1",
      recipient: "0x0000000000000000000000000000000000000f01" as Address,
      quote: {
        ...quote,
        path: [BASE_TOKEN.address, WETH_TOKEN.address],
      },
      useNativeOut: true,
    });
    const decodedOut = decodeFunctionData({ abi: UNISWAP_V2_ROUTER_ABI, data: nativeOutTx.data });
    expect(decodedOut.functionName).toBe("swapTokensForExactETH");
  });

  it("fetches user portfolio data", async () => {
    const user = "0x0000000000000000000000000000000000000abc" as Address;
    const sdk = new GteSdk({
      restOptions: {
        baseUrl: "https://mock.gte",
        fetchImpl: createMockFetch({
          "/markets": [MOCK_MARKET],
          [`/users/${user}/portfolio`]: MOCK_PORTFOLIO,
        }),
      },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const portfolio = await sdk.getUserPortfolio(user);
    expect(portfolio.totalUsdBalance).toBe("2000");
    expect(portfolio.tokens[0].token.address).toBe(BASE_TOKEN.address);
  });
});

function makeFetch(overrides: Record<string, unknown> = {}): typeof fetch {
  return createMockFetch({ ...DEFAULT_RESPONSES, ...overrides });
}

function createMockFetch(responses: Record<string, unknown>): typeof fetch {
  return async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const payload = responses[url.pathname];
    if (!payload) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function createPublicClientMock(
  resolver: (args: Parameters<PublicClient["readContract"]>[0]) => Promise<any>,
): PublicClient {
  return {
    readContract: resolver,
  } as unknown as PublicClient;
}
