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

export interface GetTokensParams {
  limit?: number;
  offset?: number;
  marketType?: MarketType;
  creator?: Address;
  metadata?: boolean;
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

export interface TokenBalance {
  token: TokenSummary;
  balance: string;
  balanceUsd: string;
  realizedPnlUsd: string;
  unrealizedPnlUsd: string;
}

export interface UserPortfolio {
  tokens: TokenBalance[];
  totalUsdBalance: string;
}

export interface QuoteExactOutRequest {
  tokenIn: TokenSummary;
  tokenOut: TokenSummary;
  amountOut: string | number | bigint;
  slippageBps?: number;
  path?: Address[];
}

export interface QuoteExactOutResult {
  amountOut: string;
  amountOutAtomic: bigint;
  expectedAmountIn: string;
  expectedAmountInAtomic: bigint;
  maxAmountIn: string;
  maxAmountInAtomic: bigint;
  price: string;
  slippageBps: number;
  path: Address[];
}

export interface MarketTrade {
  price: string;
  size: string;
  side: "buy" | "sell";
  timestamp: number;
  txHash?: string;
}

export interface MarketOrderBookLevel {
  price: string;
  size: string;
}

export interface MarketOrderBookSnapshot {
  bids: MarketOrderBookLevel[];
  asks: MarketOrderBookLevel[];
}

export interface MarketCandle {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  numTrades?: number;
}

export interface GetTradesParams {
  limit?: number;
  offset?: number;
}

export interface GetCandlesParams {
  interval: string;
  startTime: number;
  endTime?: number;
  limit?: number;
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

export interface SwapExactOutParams extends QuoteExactOutRequest {
  recipient: Address;
  deadlineSeconds?: number;
  quote?: QuoteExactOutResult;
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

export interface BuildSwapExactOutResult {
  tx: PreparedTransaction;
  quote: QuoteExactOutResult;
  deadline: number;
}
