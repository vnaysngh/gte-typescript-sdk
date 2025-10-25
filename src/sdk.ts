import {
  Address,
  Chain,
  Hex,
  PublicClient,
  createPublicClient,
  encodeFunctionData,
  formatUnits,
  http,
  parseUnits,
} from "viem";

import { RestClient } from "./http";
import {
  BuildApproveParams,
  BuildSwapExactInResult,
  ChainConfig,
  GetMarketsParams,
  MarketSummary,
  PreparedTransaction,
  QuoteRequest,
  QuoteResult,
  RestClientOptions,
  UserPortfolio,
  SwapExactInParams,
} from "./types";
import {
  DEFAULT_SLIPPAGE_BPS,
  ERC20_ABI,
  GTE_ROUTER_MIN_ABI,
  MAX_UINT256,
  MEGAETH_TESTNET_CHAIN_CONFIG,
  UNISWAP_V2_ROUTER_ABI,
} from "./constants";

export interface GteSdkOptions {
  chainConfig?: ChainConfig;
  restOptions?: RestClientOptions;
  rpcUrl?: string;
  publicClient?: PublicClient;
  uniswapRouterAddress?: Address;
}

interface QuoteContext extends QuoteRequest {
  slippageBps: number;
}

export class GteSdk {
  private readonly chain: ChainConfig;
  private readonly rest: RestClient;
  private readonly rpcUrl: string;
  private readonly customUniswapRouter?: Address;
  private publicClient: PublicClient;
  private cachedUniswapRouter?: Address;

  constructor(options: GteSdkOptions = {}) {
    this.chain = options.chainConfig ?? MEGAETH_TESTNET_CHAIN_CONFIG;
    this.rpcUrl = options.rpcUrl ?? this.chain.rpcHttpUrl;
    this.rest = new RestClient({
      baseUrl: options.restOptions?.baseUrl ?? this.chain.apiUrl,
      ...options.restOptions,
    });
    this.publicClient =
      options.publicClient ??
      createPublicClient({ chain: toViemChain(this.chain, this.rpcUrl), transport: http(this.rpcUrl) });
    this.customUniswapRouter = options.uniswapRouterAddress;
  }

  getChainConfig(): ChainConfig {
    return {
      ...this.chain,
      eip1559: { ...this.chain.eip1559 },
    };
  }

  async getMarkets(params: GetMarketsParams = {}): Promise<MarketSummary[]> {
    const query = {
      limit: params.limit,
      offset: params.offset,
      marketType: params.marketType,
      sortBy: params.sortBy,
      tokenAddress: params.tokenAddress,
      newlyGraduated: params.newlyGraduated,
    };
    const response = await this.rest.get<MarketSummary[]>("/markets", query);
    return response;
  }

  getUserPortfolio(userAddress: Address): Promise<UserPortfolio> {
    return this.rest.get<UserPortfolio>(`/users/${userAddress}/portfolio`);
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResult> {
    const slippageBps = request.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const ctx: QuoteContext = { ...request, slippageBps };
    const path = ctx.path ?? [ctx.tokenIn.address, ctx.tokenOut.address];
    if (path.length < 2) {
      throw new Error("Quote path must include at least tokenIn and tokenOut");
    }
    const amountInAtomic = this.toAtomic(ctx.amountIn, ctx.tokenIn.decimals);
    const router = await this.getUniswapRouterAddress();
    const amountsOut = await this.publicClient.readContract({
      address: router,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [amountInAtomic, path],
    });
    const expectedAmountOutAtomic = amountsOut[amountsOut.length - 1];
    const expectedAmountOut = formatUnits(expectedAmountOutAtomic, ctx.tokenOut.decimals);
    const minAmountOutAtomic =
      (expectedAmountOutAtomic * BigInt(10_000 - slippageBps)) / 10_000n;
    const minAmountOut = formatUnits(minAmountOutAtomic, ctx.tokenOut.decimals);
    const inputFloat = parseFloat(this.toDecimalString(ctx.amountIn));
    const price =
      inputFloat > 0 ? parseFloat(expectedAmountOut) / inputFloat : 0;

    return {
      amountIn: this.toDecimalString(ctx.amountIn),
      amountInAtomic,
      expectedAmountOut,
      expectedAmountOutAtomic,
      minAmountOut,
      minAmountOutAtomic,
      price: Number.isFinite(price) ? price.toString() : "0",
      slippageBps,
      path,
    };
  }

  async buildApprove(params: BuildApproveParams): Promise<PreparedTransaction> {
    const spender = params.spender ?? (await this.getUniswapRouterAddress());
    const amountAtomic = this.resolveApprovalAmount(params);
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amountAtomic],
    });

    return {
      to: params.tokenAddress,
      data,
      value: 0n,
      chainId: this.chain.id,
    };
  }

  async buildSwapExactIn(params: SwapExactInParams): Promise<BuildSwapExactInResult> {
    const quote = params.quote ?? (await this.getQuote(params));
    const router = await this.getUniswapRouterAddress();
    const deadlineSeconds = params.deadlineSeconds ?? 20 * 60;
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
    const data = this.encodeSwapCalldata({
      quote,
      recipient: params.recipient,
      deadline,
      useNativeIn: params.useNativeIn ?? false,
      useNativeOut: params.useNativeOut ?? false,
      wethAddress: this.chain.wethAddress,
    });

    const value = params.useNativeIn ? quote.amountInAtomic : 0n;

    return {
      tx: {
        to: router,
        data,
        value,
        chainId: this.chain.id,
      },
      quote,
      deadline,
    };
  }

  private resolveApprovalAmount(params: BuildApproveParams): bigint {
    if (params.amount === undefined) {
      return MAX_UINT256;
    }
    if (typeof params.amount === "bigint") {
      return params.amount;
    }
    if (params.decimals === undefined) {
      return BigInt(params.amount.toString());
    }
    return parseUnits(this.toDecimalString(params.amount), params.decimals);
  }

  private toAtomic(amount: string | number | bigint, decimals: number): bigint {
    if (typeof amount === "bigint") {
      return amount;
    }
    return parseUnits(this.toDecimalString(amount), decimals);
  }

  private toDecimalString(amount: string | number | bigint): string {
    if (typeof amount === "string") return amount;
    return amount.toString();
  }

  private async getUniswapRouterAddress(): Promise<Address> {
    if (this.customUniswapRouter) {
      return this.customUniswapRouter;
    }
    if (this.cachedUniswapRouter) {
      return this.cachedUniswapRouter;
    }
    const router = await this.publicClient.readContract({
      address: this.chain.routerAddress,
      abi: GTE_ROUTER_MIN_ABI,
      functionName: "uniV2Router",
      args: [],
    });
    this.cachedUniswapRouter = router as Address;
    return router as Address;
  }

  private encodeSwapCalldata(args: {
    quote: QuoteResult;
    recipient: Address;
    deadline: number;
    useNativeIn: boolean;
    useNativeOut: boolean;
    wethAddress: Address;
  }): Hex {
    const deadlineBigInt = BigInt(args.deadline);
    if (args.useNativeIn && args.useNativeOut) {
      throw new Error("Cannot use native token for both input and output");
    }
    if (args.useNativeIn && args.quote.path[0]?.toLowerCase() !== args.wethAddress.toLowerCase()) {
      throw new Error("Native input swaps must start the path with the wrapped native token");
    }
    const lastHop = args.quote.path[args.quote.path.length - 1];
    if (args.useNativeOut && lastHop?.toLowerCase() !== args.wethAddress.toLowerCase()) {
      throw new Error("Native output swaps must end the path with the wrapped native token");
    }
    if (args.useNativeIn) {
      return encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [args.quote.minAmountOutAtomic, args.quote.path, args.recipient, deadlineBigInt],
      });
    }
    if (args.useNativeOut) {
      return encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [
          args.quote.amountInAtomic,
          args.quote.minAmountOutAtomic,
          args.quote.path,
          args.recipient,
          deadlineBigInt,
        ],
      });
    }
    return encodeFunctionData({
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [
        args.quote.amountInAtomic,
        args.quote.minAmountOutAtomic,
        args.quote.path,
        args.recipient,
        deadlineBigInt,
      ],
    });
  }
}

function toViemChain(config: ChainConfig, rpcUrl: string): Chain {
  return {
    id: config.id,
    name: config.name,
    nativeCurrency: { name: config.nativeSymbol, symbol: config.nativeSymbol, decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  } as Chain;
}
