import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: __dirname + "/.env" });

import "./tasks";

import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";

const accounts =
  process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
    optimismGoerli: {
      url: process.env.NODE_URL_OPTIMISM || "",
      chainId: 420,
      accounts,
    },
    sepolia: {
      url: process.env.NODE_URL_SEPOLIA || "",
      chainId: 11155111,
      accounts,
    },
    baseGoerli: {
      url: process.env.NODE_URL_BASE || "",
      chainId: 84531,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      optimisticGoerli: process.env.ETHERSCAN_OPTIMISM_API_KEY || "",
      sepolia: process.env.ETHERSCAN_SEPOLIA_API_KEY || "",
      baseGoerli: process.env.ETHERSCAN_BASE_API_KEY || "",
    },
  },
};

export default config;
