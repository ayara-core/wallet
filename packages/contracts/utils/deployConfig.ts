import { ZeroAddress } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const DEFAULT_CHAIN_ID = 31337;

export interface SystemConfig {
  ayaraConfig: {
    salt: string;
  };
  ayaraInstances: {
    sepolia: {
      chainId: number;
      name: string;
      chainSelector: bigint;
    };
    optimism: {
      chainId: number;
      name: string;
      chainSelector: bigint;
    };
    base: {
      chainId: number;
      name: string;
      chainSelector: bigint;
    };
  };
}

export function getSystemConfig(hre: HardhatRuntimeEnvironment): SystemConfig {
  const ayaraConfig = {
    salt: hre.ethers.encodeBytes32String("ayara"),
  };
  const ayaraInstances = {
    sepolia: {
      chainId: 11155111,
      name: "AyaraControllerSepolia",
      chainSelector: 16015286601757825753n,
    },
    optimism: {
      chainId: 420,
      name: "AyaraControllerOptimism",
      chainSelector: 2664363617261496610n,
    },
    base: {
      chainId: 84531,
      name: "AyaraControllerBase",
      chainSelector: 5790810961207155433n,
    },
  };

  return { ayaraConfig, ayaraInstances };
}

function getChainId(hre: HardhatRuntimeEnvironment) {
  return hre.network.config.chainId;
}
