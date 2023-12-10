import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Signer } from "ethers";

import {
  Create2Factory,
  AyaraController,
  AyaraController__factory,
  ERC20Mock,
  ERC20Mock__factory,
  CCIPRouterMock,
  CCIPRouterMock__factory,
} from "../typechain-types";

import { getDeployedAddress } from "../utils/saveAddress";
import { deployAyaraController } from "./deployAyaraController";

import {
  getSystemConfig,
  SystemConfig,
  getDeployConfig,
} from "../utils/deployConfig";
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

export async function deploySystem(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  options?: { unitTest?: boolean; slowMode?: boolean }
): Promise<SystemDeployed> {
  log("Deploying System");
  const { ayaraConfig, ayaraInstances } = getSystemConfig(hre);
  let deploymentOverrides = {
    gasPrice: hre.ethers.parseUnits("1.0", "gwei"),
  };

  // Set to true by default
  const unitTest = options?.unitTest !== undefined ? options.unitTest : true;
  // Set to false by default
  const slowMode = options?.slowMode !== undefined ? options.slowMode : false;
  log(`unitTest: ${unitTest}`);
  log(`slowMode: ${slowMode}`);

  const create2Factory = await deployContract<Create2Factory>(
    hre,
    signer,
    "Create2Factory",
    [],
    deploymentOverrides
  );

  const mocks = await deployMocks(hre, signer, create2Factory, true);

  let ayaraControllerPrimary,
    ayaraControllerOptimism,
    ayaraControllerBase,
    ccipRouterMock;

  if (unitTest) {
    ({
      ayaraControllerPrimary,
      ayaraControllerOptimism,
      ayaraControllerBase,
      ccipRouterMock,
    } = await deploySystemForLocal(
      hre,
      signer,
      create2Factory,
      ayaraInstances,
      mocks.erc20Mock
    ));
  } else {
    ayaraControllerPrimary = await deployAyaraController(
      hre,
      signer,
      create2Factory,
      {
        chainId: hre.network.config.chainId ?? 31337,
        name: "AyaraController",
      },
      {
        useCreate2: false,
        slowMode: slowMode,
      }
    );
  }

  return {
    create2Factory,
    ayaraControllerPrimary: ayaraControllerPrimary,
    ayaraControllerOptimism: ayaraControllerOptimism,
    ayaraControllerBase: ayaraControllerBase,
    mocks,
    ccipRouterMock,
  };
}

export async function deployMocks(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  create2Factory: Create2Factory,
  forceCreate2?: boolean
): Promise<MocksDeployed> {
  log("Deploying Mocks");
  const deploymentOverrides = {
    gasPrice: hre.ethers.parseUnits("4.0", "gwei"),
  };

  let erc20Mock: ERC20Mock;

  // Check if ERC20Mock is already deployed, but only for non-local networks
  const deployedAddress = await getDeployedAddress(hre, "ERC20Mock");
  if (
    deployedAddress &&
    hre.network.name !== "hardhat" &&
    hre.network.name !== "localhost"
  ) {
    log(`ERC20Mock already deployed to ${deployedAddress}`);
    const contract = new ERC20Mock__factory(signer).attach(
      deployedAddress
    ) as ERC20Mock;
    return {
      erc20Mock: contract,
    };
  }

  // Force deploy with create2, overwrite if create2 does not work
  if (
    forceCreate2 ||
    hre.network.name === "hardhat" ||
    hre.network.name === "localhost"
  ) {
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
  } else {
    // Deploy mocks with regular deploy
    erc20Mock = await deployContract<ERC20Mock>(
      hre,
      signer,
      "ERC20Mock",
      [],
      deploymentOverrides
    );
  }
  log(`ERC20Mock: ${await erc20Mock.getAddress()}`);

  return {
    erc20Mock,
  };
}

export async function deploySystemForLocal(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  create2Factory: Create2Factory,
  ayaraInstances: SystemConfig["ayaraInstances"],
  linkToken: ERC20Mock
): Promise<SystemDeployed> {
  log("Deploying System for Local");

  const ccipRouterMock = await deployContractWithCreate2<
    CCIPRouterMock,
    CCIPRouterMock__factory
  >(
    hre,
    new CCIPRouterMock__factory(signer),
    create2Factory,
    "CCIPRouterMock",
    []
  );
  const router = await ccipRouterMock.getAddress();
  const link = await linkToken.getAddress();
  const options = { useCreate2: true, router, link, localTest: true };

  log(`CCIPRouterMock: ${router}`);
  log(`LinkToken: ${link}`);

  const ayaraControllerPrimary = await deployAyaraController(
    hre,
    signer,
    create2Factory,
    ayaraInstances.sepolia,
    options
  );

  const ayaraControllerOptimism = await deployAyaraController(
    hre,
    signer,
    create2Factory,
    ayaraInstances.optimism,
    options
  );

  const ayaraControllerBase = await deployAyaraController(
    hre,
    signer,
    create2Factory,
    ayaraInstances.base,
    options
  );
  // Set the addresses of the controllers on the CCIPRouterMock
  await ccipRouterMock._mockSetChainSelectorsToContracts(
    [
      ayaraInstances.sepolia.chainSelector,
      ayaraInstances.optimism.chainSelector,
      ayaraInstances.base.chainSelector,
    ],
    [
      await ayaraControllerPrimary.getAddress(),
      await ayaraControllerOptimism.getAddress(),
      await ayaraControllerBase.getAddress(),
    ]
  );

  return {
    create2Factory,
    ayaraControllerPrimary,
    ayaraControllerOptimism,
    ayaraControllerBase,
    ccipRouterMock,
  };
}
