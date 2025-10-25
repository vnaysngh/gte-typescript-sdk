import type { Address, Hex } from "viem";

export type MarketType = "amm" | "bonding-curve" | "clob-spot" | "perps";

export interface TokenSummary {
  address: Address;
  decimals: number;
  name: string;
  symbol: string;
  logoUri?: string | null;
  priceUsd?: string | null;
  totalSupply?: string | null;
}

export interface MarketSummary {
  marketType: MarketType;
  address: Address;
  baseToken: TokenSummary;
  quoteToken: TokenSummary;
  price: string;
  priceUsd: string;
  volume24HrUsd: string;
  volume1HrUsd: string;
  marketCapUsd: string;
  createdAt: number;
  tvlUsd?: string | null;
}

export interface ChainConfig {
  id: number;
  name: string;
  apiUrl: string;
  wsUrl: string;
  rpcHttpUrl: string;
  rpcWsUrl: string;
  routerAddress: Address;
  wethAddress: Address;
  clobManagerAddress: Address;
  launchpadAddress: Address;
  explorerUrl: string;
  performanceDashboardUrl: string;
  nativeSymbol: string;
  eip1559: {
    baseFeeGwei: number;
    maxBlockGas: number;
    targetBlockGas: number;
  };
}

export interface RestClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
  rateLimitMs?: number;
  headers?: Record<string, string>;
}

export interface GetMarketsParams {
  limit?: number;
  offset?: number;
  marketType?: MarketType;
  sortBy?: "marketCap" | "createdAt" | "volume";
  tokenAddress?: Address;
  newlyGraduated?: boolean;
}

export interface QuoteRequest {
  tokenIn: TokenSummary;
  tokenOut: TokenSummary;
  amountIn: string | number | bigint;
  slippageBps?: number;
  path?: Address[];
}

export interface QuoteResult {
  amountIn: string;
  amountInAtomic: bigint;
  expectedAmountOut: string;
  expectedAmountOutAtomic: bigint;
  minAmountOut: string;
  minAmountOutAtomic: bigint;
  price: string; // tokenOut per tokenIn
  slippageBps: number;
  path: Address[];
}

export interface BuildApproveParams {
  tokenAddress: Address;
  spender?: Address;
  amount?: string | number | bigint;
  decimals?: number;
}

export interface SwapExactInParams extends QuoteRequest {
  recipient: Address;
  deadlineSeconds?: number;
  quote?: QuoteResult;
  useNativeIn?: boolean;
  useNativeOut?: boolean;
}

export interface PreparedTransaction {
  to: Address;
  data: Hex;
  value?: bigint;
  chainId?: number;
  gas?: bigint;
}

export interface BuildSwapExactInResult {
  tx: PreparedTransaction;
  quote: QuoteResult;
  deadline: number;
}
