const Ethereum = {
  hex: "0x1",
  name: "Ethereum",
  rpcUrl: process.env.REACT_APP_ETHEREUM_RPC_URL,
  ticker: "ETH",
};

const MumbaiTestnet = {
  hex: "0x13881",
  name: "Mumbai Testnet",
  rpcUrl: process.env.REACT_APP_MUMBAI_RPC_URL,
  ticker: "MATIC",
};

const SepoliaTestnet = {
  hex: "0xaa36a7",
  name: "Sepolia Testnet",
  rpcUrl: process.env.REACT_APP_SEPOLIA_RPC_URL,
  ticker: "ETH",
};

const BaseSepoliaTestnet = {
  hex: "0x14a34",
  name: "BASE Sepolia Testnet",
  rpcUrl: process.env.REACT_APP_BASESEPOLIA_RPC_URL,
  ticker: "ETH",
};

export const CHAINS_CONFIG = {
  "0x1": Ethereum,
  "0x13881": MumbaiTestnet,
  "0xaa36a7": SepoliaTestnet,
  "0x14a34": BaseSepoliaTestnet
};
