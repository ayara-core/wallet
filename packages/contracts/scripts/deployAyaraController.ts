import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Signer } from "ethers";

import {
  Create2Factory,
  AyaraController,
  AyaraController__factory,
  ERC20Mock,
  CCIPRouterMock,
} from "../typechain-types";

import { getSystemConfig, getDeployConfig } from "../utils/deployConfig";
import {
  deployContract,
  deployContractWithCreate2,
  logger,
} from "../utils/deployUtils";

const log = logger("log", "deploy");

export interface MocksDeployed {
  erc20Mock: ERC20Mock;
}

export interface SystemDeployed {
  create2Factory: Create2Factory;
  ayaraControllerPrimary: AyaraController;
  ayaraControllerOptimism?: AyaraController;
  ayaraControllerBase?: AyaraController;
  mocks?: MocksDeployed;
  ccipRouterMock?: CCIPRouterMock;
}

export async function deployAyaraController(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  create2Factory: Create2Factory,
  ayaraInstance: { chainId: number; name: string },
  options?: {
    router?: string;
    link?: string;
    useCreate2?: boolean;
    localTest?: boolean;
    create2Salt?: string;
    slowMode?: boolean;
  }
): Promise<AyaraController> {
  const link =
    options?.link || getDeployConfig().linkTokenAddress[ayaraInstance.chainId];

  const router =
    options?.router || getDeployConfig().routerAddress[ayaraInstance.chainId];

  const slowMode = options?.slowMode !== undefined ? options.slowMode : false;

  let localdeploy =
    options?.localTest !== undefined ? options?.localTest : false;
  const systemConfig = getSystemConfig(hre);

  const create2Salt = options?.create2Salt || ayaraInstance.name;

  log("deployAyaraController", ayaraInstance.name);
  log(`chainId: ${ayaraInstance.chainId}`);

  log(`Using router: ${router}`);
  log(`Using linkToken: ${link}`);
  log(`Using create2Salt: ${create2Salt}`);
  log(`Using localdeploy: ${localdeploy}`);

  const deploymentOverrides = {
    gasPrice: hre.ethers.parseUnits("10.0", "gwei"),
  };

  const deployCreate2Options = {
    overrides: deploymentOverrides,
    create2Options: {
      amount: 0,
      salt: 0,
      callbacks: [],
    },
    waitForBlocks: slowMode ? 10 : 0,
  };

  const withSalt = (salt: string) => ({
    ...deployCreate2Options,
    create2Options: { ...deployCreate2Options.create2Options, salt },
  });

  let ayaraController: AyaraController;

  if (options?.useCreate2) {
    ayaraController = await deployContractWithCreate2<
      AyaraController,
      AyaraController__factory
    >(
      hre,
      new AyaraController__factory(),
      create2Factory,
      "AyaraController",
      [
        await signer.getAddress(),
        systemConfig.ayaraConfig.salt,
        ayaraInstance.chainId,
        [link],
        router,
        link,
      ],
      withSalt(create2Salt)
    );
  } else {
    ayaraController = await deployContract<AyaraController>(
      hre,
      signer,
      "AyaraController",
      [
        await signer.getAddress(),
        systemConfig.ayaraConfig.salt,
        ayaraInstance.chainId,
        [link],
        router,
        link,
      ],
      deploymentOverrides
    );

    return ayaraController;
  }

  return ayaraController;
}
