import hardhatConfig from "./hardhat.config";

export default {
  ...hardhatConfig,
  networks: {
    ...hardhatConfig.networks,
    hardhat: {
      chainId: 420,
      forking: {
        url: process.env.NODE_URL_OPTIMISM || "",
        blockNumber: 18256780,
      },
    },
  },
};
