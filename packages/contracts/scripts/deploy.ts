import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Signer } from "ethers";

import {

} from "../typechain-types";

import { getSystemConfig, SystemConfig } from "../utils/deployConfig";
import {
  deployContract,
  deployContractWithCreate2,
  logger,
} from "../utils/deployUtils";

const info = logger("info", "deploy");
export interface MocksDeployed {
  erc20Mock: ERC20Mock;

}

export interface SystemDeployed {
  // packAccount: PackAccount;

}

export async function deployMocks(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  create2Factory: Create2Factory
): Promise<MocksDeployed> {
  info("Deploying Mocks");
  const deploymentOverrides = {
    gasPrice: hre.ethers.parseUnits("1.0", "gwei"),
  };

  let erc20Mock: ERC20Mock;


  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    // Deploy mocks with create2
    const deployCreate2Options = {
      overrides: deploymentOverrides,
      create2Options: { amount: 0, salt: "test", callbacks: [] },
      waitForBlocks: 0,
    };
    const withSalt = (salt: string) => ({
      ...deployCreate2Options,
      create2Options: { ...deployCreate2Options.create2Options, salt },
    });

    erc20Mock = await deployContractWithCreate2<ERC20Mock, ERC20Mock__factory>(
      hre,
      new ERC20Mock__factory(signer),
      create2Factory,
      "ERC20Mock",
      [],
      withSalt("ERC20Mock")
    );
   
  
  return {
    erc20Mock,

  };
}
export async function deploySystem(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  systemConfig: SystemConfig
): Promise<SystemDeployed> {
  info("Deploying System");
  const { packConfig } = getSystemConfig(hre);
  let deploymentOverrides = {
    gasPrice: hre.ethers.parseUnits("1.0", "gwei"),
  };

  const create2Factory = await deployContract<Create2Factory>(
    hre,
    signer,
    "Create2Factory",
    [],
    deploymentOverrides
  );

  // const packMain = await deployContract<PackMain>(
  //   hre,
  //   signer,
  //   "PackMain",
  //   [
  //     await signer.getAddress(),
  //     systemConfig.packConfig.initBaseURI,
  //     systemConfig.packConfig.name,
  //     systemConfig.packConfig.symbol,
  //     await packRegistry.getAddress(),
  //     await packAccount.getAddress(),
  //     systemConfig.packConfig.registryChainId,
  //     systemConfig.packConfig.salt,
  //     [await erc20Module.getAddress(), await erc721Module.getAddress()],
  //   ],
  //   deploymentOverrides
  // );
  const mocks = await deployMocks(hre, signer, create2Factory);
  return {
    create2Factory,
    ...mocks,
  };
}
