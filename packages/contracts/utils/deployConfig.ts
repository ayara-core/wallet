import { ZeroAddress } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const DEFAULT_CHAIN_ID = 31337;

export interface SystemConfig {
  ayaraConfig: {};
}

export function getSystemConfig(hre: HardhatRuntimeEnvironment): SystemConfig {
  const ayaraConfig = {};

  return { ayaraConfig };
}

function getChainId(hre: HardhatRuntimeEnvironment) {
  return hre.network.config.chainId;
}
