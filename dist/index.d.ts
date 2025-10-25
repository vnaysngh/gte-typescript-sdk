import { Address, Hex, PublicClient } from 'viem';

type MarketType = "amm" | "bonding-curve" | "clob-spot" | "perps";
interface TokenSummary {
    address: Address;
    decimals: number;
    name: string;
    symbol: string;
    logoUri?: string | null;
    priceUsd?: string | null;
    totalSupply?: string | null;
}
interface MarketSummary {
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
interface ChainConfig {
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
interface RestClientOptions {
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    maxRetries?: number;
    retryDelayMs?: number;
    rateLimitMs?: number;
    headers?: Record<string, string>;
}
interface GetMarketsParams {
    limit?: number;
    offset?: number;
    marketType?: MarketType;
    sortBy?: "marketCap" | "createdAt" | "volume";
    tokenAddress?: Address;
    newlyGraduated?: boolean;
}
interface QuoteRequest {
    tokenIn: TokenSummary;
    tokenOut: TokenSummary;
    amountIn: string | number | bigint;
    slippageBps?: number;
    path?: Address[];
}
interface QuoteResult {
    amountIn: string;
    amountInAtomic: bigint;
    expectedAmountOut: string;
    expectedAmountOutAtomic: bigint;
    minAmountOut: string;
    minAmountOutAtomic: bigint;
    price: string;
    slippageBps: number;
    path: Address[];
}
interface BuildApproveParams {
    tokenAddress: Address;
    spender?: Address;
    amount?: string | number | bigint;
    decimals?: number;
}
interface SwapExactInParams extends QuoteRequest {
    recipient: Address;
    deadlineSeconds?: number;
    quote?: QuoteResult;
    useNativeIn?: boolean;
    useNativeOut?: boolean;
}
interface PreparedTransaction {
    to: Address;
    data: Hex;
    value?: bigint;
    chainId?: number;
    gas?: bigint;
}
interface BuildSwapExactInResult {
    tx: PreparedTransaction;
    quote: QuoteResult;
    deadline: number;
}

interface GteSdkOptions {
    chainConfig?: ChainConfig;
    restOptions?: RestClientOptions;
    rpcUrl?: string;
    publicClient?: PublicClient;
    uniswapRouterAddress?: Address;
}
declare class GteSdk {
    private readonly chain;
    private readonly rest;
    private readonly rpcUrl;
    private readonly customUniswapRouter?;
    private publicClient;
    private cachedUniswapRouter?;
    constructor(options?: GteSdkOptions);
    getChainConfig(): ChainConfig;
    getMarkets(params?: GetMarketsParams): Promise<MarketSummary[]>;
    getQuote(request: QuoteRequest): Promise<QuoteResult>;
    buildApprove(params: BuildApproveParams): Promise<PreparedTransaction>;
    buildSwapExactIn(params: SwapExactInParams): Promise<BuildSwapExactInResult>;
    private resolveApprovalAmount;
    private toAtomic;
    private toDecimalString;
    private getUniswapRouterAddress;
    private encodeSwapCalldata;
}

interface RequestOptions {
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    signal?: AbortSignal;
}
declare class RestClient {
    private readonly baseUrl;
    private readonly fetchImpl;
    private readonly maxRetries;
    private readonly retryDelayMs;
    private readonly rateLimitMs;
    private readonly headers;
    private lastRequestAt;
    constructor(options?: RestClientOptions);
    private rateLimit;
    private buildUrl;
    private request;
    get<T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal): Promise<T>;
}

declare const DEFAULT_SLIPPAGE_BPS = 50;
declare const MAX_UINT256: bigint;
declare const MEGAETH_TESTNET_CHAIN_CONFIG: ChainConfig;

export { type BuildApproveParams, type BuildSwapExactInResult, type ChainConfig, DEFAULT_SLIPPAGE_BPS, type GetMarketsParams, GteSdk, type GteSdkOptions, MAX_UINT256, MEGAETH_TESTNET_CHAIN_CONFIG, type MarketSummary, type MarketType, type PreparedTransaction, type QuoteRequest, type QuoteResult, RestClient, type RestClientOptions, type SwapExactInParams, type TokenSummary };
