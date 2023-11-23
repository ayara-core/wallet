import { ZeroAddress } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const DEFAULT_CHAIN_ID = 31337;

export interface SystemConfig {
  ayaraConfig: {
    salt: string;
  };
}

export function getSystemConfig(hre: HardhatRuntimeEnvironment): SystemConfig {
  const ayaraConfig = {
    salt: hre.ethers.encodeBytes32String("ayara"),
  };

  return { ayaraConfig };
}

function getChainId(hre: HardhatRuntimeEnvironment) {
  return hre.network.config.chainId;
}
