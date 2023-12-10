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

export interface DeployConfig {
  linkTokenAddress: {
    [chainId: number]: string;
  };
  routerAddress: {
    [chainId: number]: string;
  };
  chainSelector: {
    [chainId: number]: bigint;
  };
}

export function getDeployConfig(): DeployConfig {
  return {
    linkTokenAddress: {
      // Sepolia
      [11155111]: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
      // Optimism
      [420]: "0xdc2CC710e42857672E7907CF474a69B63B93089f",
      // Base
      [84531]: "0x6D0F8D488B669aa9BA2D0f0b7B75a88bf5051CD3",
      // [84531]: "0xd886e2286fd1073df82462ea1822119600af80b6",
    },
    routerAddress: {
      [11155111]: "0xd0daae2231e9cb96b94c8512223533293c3693bf",
      [420]: "0xEB52E9Ae4A9Fb37172978642d4C141ef53876f26",
      [84531]: "0xa8c0c11bf64af62cdca6f93d3769b88bdd7cb93d",
    },
    chainSelector: {
      [11155111]: 16015286601757825753n,
      [420]: 2664363617261496610n,
      [84531]: 5790810961207155433n,
    },
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
