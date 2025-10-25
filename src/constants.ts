import type { Address } from "viem";
import type { ChainConfig } from "./types";

export const DEFAULT_SLIPPAGE_BPS = 50; // 0.50%
export const MAX_UINT256 = (1n << 256n) - 1n;

export const MEGAETH_TESTNET_CHAIN_CONFIG: ChainConfig = {
  id: 6342,
  name: "MegaETH Testnet",
  apiUrl: "https://api-testnet.gte.xyz/v1",
  wsUrl: "wss://api-testnet.gte.xyz/ws",
  rpcHttpUrl: "https://api-testnet.gte.xyz/v1/exchange",
  rpcWsUrl: "wss://carrot.megaeth.com/ws",
  routerAddress: "0x86470efcEa37e50F94E74649463b737C87ada367" as Address,
  wethAddress: "0x776401b9BC8aAe31A685731B7147D4445fD9FB19" as Address,
  clobManagerAddress: "0xD7310f8A0D569Dd0803D28BB29f4E0A471fA84F6" as Address,
  launchpadAddress: "0x0B6cD1DefCe3189Df60A210326E315383fbC14Ed" as Address,
  explorerUrl: "https://megaexplorer.xyz",
  performanceDashboardUrl: "https://uptime.megaeth.com",
  nativeSymbol: "ETH",
  eip1559: {
    baseFeeGwei: 0.0025,
    maxBlockGas: 2_000_000_000,
    targetBlockGas: 1_000_000_000,
  },
};

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
];

export const UNISWAP_V2_ROUTER_ABI = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getAmountsIn",
    stateMutability: "view",
    inputs: [
      { name: "amountOut", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
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
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
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
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactETHForTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
];

export const GTE_ROUTER_MIN_ABI = [
  {
    type: "function",
    name: "uniV2Router",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "router", type: "address" }],
  },
  {
    type: "function",
    name: "weth",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "token", type: "address" }],
  },
];
