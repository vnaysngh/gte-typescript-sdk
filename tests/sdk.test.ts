import { describe, expect, it } from "vitest";
import { decodeFunctionData, parseUnits, type Address, type PublicClient } from "viem";

import { GteSdk } from "../src";
import { ERC20_ABI, UNISWAP_V2_ROUTER_ABI } from "../src/constants";
import type { MarketSummary, QuoteResult, TokenSummary, UserPortfolio } from "../src/types";

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

const noopFetch = createMockFetch({});
const noopPublicClient = createPublicClientMock(async () => {
  throw new Error("readContract should not be called");
});

describe("GteSdk", () => {
  it("fetches markets via REST", async () => {
    const sdk = new GteSdk({
      restOptions: {
        baseUrl: "https://mock.gte",
        fetchImpl: createMockFetch({ "/markets": [MOCK_MARKET] }),
      },
      publicClient: noopPublicClient,
      uniswapRouterAddress: MOCK_ROUTER,
    });

    const markets = await sdk.getMarkets({ limit: 1 });
    expect(markets).toHaveLength(1);
    expect(markets[0].address).toBe(MOCK_MARKET.address);
    expect(markets[0].baseToken.symbol).toBe("BASE");
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
