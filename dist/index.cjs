"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_SLIPPAGE_BPS: () => DEFAULT_SLIPPAGE_BPS,
  GteSdk: () => GteSdk,
  MAX_UINT256: () => MAX_UINT256,
  MEGAETH_TESTNET_CHAIN_CONFIG: () => MEGAETH_TESTNET_CHAIN_CONFIG,
  RestClient: () => RestClient
});
module.exports = __toCommonJS(index_exports);

// src/sdk.ts
var import_viem = require("viem");

// src/http.ts
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var RestClient = class {
  constructor(options = {}) {
    this.lastRequestAt = 0;
    this.baseUrl = (options.baseUrl ?? "https://api-testnet.gte.xyz/v1").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("A fetch implementation must be provided in non-browser environments");
    }
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.rateLimitMs = options.rateLimitMs ?? 0;
    this.headers = { "Content-Type": "application/json", ...options.headers ?? {} };
  }
  async rateLimit() {
    if (!this.rateLimitMs) return;
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.rateLimitMs) {
      await sleep(this.rateLimitMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }
  buildUrl(path, query) {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, "")}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === void 0 || value === null) return;
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }
  async request(method, path, options = {}) {
    await this.rateLimit();
    let attempt = 0;
    let lastError;
    while (attempt <= this.maxRetries) {
      try {
        const response = await this.fetchImpl(this.buildUrl(path, options.query), {
          method,
          body: options.body ? JSON.stringify(options.body) : void 0,
          headers: this.headers,
          signal: options.signal
        });
        if (!response.ok) {
          const errorPayload = await safeJson(response);
          throw new Error(
            `GTE API ${method} ${path} failed with ${response.status}: ${JSON.stringify(errorPayload)}`
          );
        }
        if (response.status === 204) {
          return void 0;
        }
        return await safeJson(response);
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt > this.maxRetries) {
          throw error;
        }
        await sleep(this.retryDelayMs * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unknown request failure");
  }
  get(path, query, signal) {
    return this.request("GET", path, { query, signal });
  }
};
async function safeJson(response) {
  const text = await response.text();
  if (!text) return void 0;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

// src/constants.ts
var DEFAULT_SLIPPAGE_BPS = 50;
var MAX_UINT256 = (1n << 256n) - 1n;
var MEGAETH_TESTNET_CHAIN_CONFIG = {
  id: 6342,
  name: "MegaETH Testnet",
  apiUrl: "https://api-testnet.gte.xyz/v1",
  wsUrl: "wss://api-testnet.gte.xyz/ws",
  rpcHttpUrl: "https://api-testnet.gte.xyz/v1/exchange",
  rpcWsUrl: "wss://carrot.megaeth.com/ws",
  routerAddress: "0x86470efcEa37e50F94E74649463b737C87ada367",
  wethAddress: "0x776401b9BC8aAe31A685731B7147D4445fD9FB19",
  clobManagerAddress: "0xD7310f8A0D569Dd0803D28BB29f4E0A471fA84F6",
  launchpadAddress: "0x0B6cD1DefCe3189Df60A210326E315383fbC14Ed",
  explorerUrl: "https://megaexplorer.xyz",
  performanceDashboardUrl: "https://uptime.megaeth.com",
  nativeSymbol: "ETH",
  eip1559: {
    baseFeeGwei: 25e-4,
    maxBlockGas: 2e9,
    targetBlockGas: 1e9
  }
};
var ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  }
];
var UNISWAP_V2_ROUTER_ABI = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getAmountsIn",
    stateMutability: "view",
    inputs: [
      { name: "amountOut", type: "uint256" },
      { name: "path", type: "address[]" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "swapExactTokensForETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "swapExactETHForTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  }
];
var GTE_ROUTER_MIN_ABI = [
  {
    type: "function",
    name: "uniV2Router",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "router", type: "address" }]
  },
  {
    type: "function",
    name: "weth",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "token", type: "address" }]
  }
];

// src/sdk.ts
var GteSdk = class {
  constructor(options = {}) {
    this.chain = options.chainConfig ?? MEGAETH_TESTNET_CHAIN_CONFIG;
    this.rpcUrl = options.rpcUrl ?? this.chain.rpcHttpUrl;
    this.rest = new RestClient({
      baseUrl: options.restOptions?.baseUrl ?? this.chain.apiUrl,
      ...options.restOptions
    });
    this.publicClient = options.publicClient ?? (0, import_viem.createPublicClient)({ chain: toViemChain(this.chain, this.rpcUrl), transport: (0, import_viem.http)(this.rpcUrl) });
    this.customUniswapRouter = options.uniswapRouterAddress;
  }
  getChainConfig() {
    return {
      ...this.chain,
      eip1559: { ...this.chain.eip1559 }
    };
  }
  async getMarkets(params = {}) {
    const query = {
      limit: params.limit,
      offset: params.offset,
      marketType: params.marketType,
      sortBy: params.sortBy,
      tokenAddress: params.tokenAddress,
      newlyGraduated: params.newlyGraduated
    };
    const response = await this.rest.get("/markets", query);
    return response;
  }
  async getQuote(request) {
    const slippageBps = request.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const ctx = { ...request, slippageBps };
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
      args: [amountInAtomic, path]
    });
    const expectedAmountOutAtomic = amountsOut[amountsOut.length - 1];
    const expectedAmountOut = (0, import_viem.formatUnits)(expectedAmountOutAtomic, ctx.tokenOut.decimals);
    const minAmountOutAtomic = expectedAmountOutAtomic * BigInt(1e4 - slippageBps) / 10000n;
    const minAmountOut = (0, import_viem.formatUnits)(minAmountOutAtomic, ctx.tokenOut.decimals);
    const inputFloat = parseFloat(this.toDecimalString(ctx.amountIn));
    const price = inputFloat > 0 ? parseFloat(expectedAmountOut) / inputFloat : 0;
    return {
      amountIn: this.toDecimalString(ctx.amountIn),
      amountInAtomic,
      expectedAmountOut,
      expectedAmountOutAtomic,
      minAmountOut,
      minAmountOutAtomic,
      price: Number.isFinite(price) ? price.toString() : "0",
      slippageBps,
      path
    };
  }
  async buildApprove(params) {
    const spender = params.spender ?? await this.getUniswapRouterAddress();
    const amountAtomic = this.resolveApprovalAmount(params);
    const data = (0, import_viem.encodeFunctionData)({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amountAtomic]
    });
    return {
      to: params.tokenAddress,
      data,
      value: 0n,
      chainId: this.chain.id
    };
  }
  async buildSwapExactIn(params) {
    const quote = params.quote ?? await this.getQuote(params);
    const router = await this.getUniswapRouterAddress();
    const deadlineSeconds = params.deadlineSeconds ?? 20 * 60;
    const deadline = Math.floor(Date.now() / 1e3) + deadlineSeconds;
    const data = this.encodeSwapCalldata({
      quote,
      recipient: params.recipient,
      deadline,
      useNativeIn: params.useNativeIn ?? false,
      useNativeOut: params.useNativeOut ?? false,
      wethAddress: this.chain.wethAddress
    });
    const value = params.useNativeIn ? quote.amountInAtomic : 0n;
    return {
      tx: {
        to: router,
        data,
        value,
        chainId: this.chain.id
      },
      quote,
      deadline
    };
  }
  resolveApprovalAmount(params) {
    if (params.amount === void 0) {
      return MAX_UINT256;
    }
    if (typeof params.amount === "bigint") {
      return params.amount;
    }
    if (params.decimals === void 0) {
      return BigInt(params.amount.toString());
    }
    return (0, import_viem.parseUnits)(this.toDecimalString(params.amount), params.decimals);
  }
  toAtomic(amount, decimals) {
    if (typeof amount === "bigint") {
      return amount;
    }
    return (0, import_viem.parseUnits)(this.toDecimalString(amount), decimals);
  }
  toDecimalString(amount) {
    if (typeof amount === "string") return amount;
    return amount.toString();
  }
  async getUniswapRouterAddress() {
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
      args: []
    });
    this.cachedUniswapRouter = router;
    return router;
  }
  encodeSwapCalldata(args) {
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
      return (0, import_viem.encodeFunctionData)({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [args.quote.minAmountOutAtomic, args.quote.path, args.recipient, deadlineBigInt]
      });
    }
    if (args.useNativeOut) {
      return (0, import_viem.encodeFunctionData)({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [
          args.quote.amountInAtomic,
          args.quote.minAmountOutAtomic,
          args.quote.path,
          args.recipient,
          deadlineBigInt
        ]
      });
    }
    return (0, import_viem.encodeFunctionData)({
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [
        args.quote.amountInAtomic,
        args.quote.minAmountOutAtomic,
        args.quote.path,
        args.recipient,
        deadlineBigInt
      ]
    });
  }
};
function toViemChain(config, rpcUrl) {
  return {
    id: config.id,
    name: config.name,
    nativeCurrency: { name: config.nativeSymbol, symbol: config.nativeSymbol, decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_SLIPPAGE_BPS,
  GteSdk,
  MAX_UINT256,
  MEGAETH_TESTNET_CHAIN_CONFIG,
  RestClient
});
//# sourceMappingURL=index.cjs.map