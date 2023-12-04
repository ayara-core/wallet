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
  create2Factory: Create2Factory;
  ayaraControllerPrimary: AyaraController;
  ayaraControllerOptimism?: AyaraController;
  ayaraControllerBase?: AyaraController;
  mocks: MocksDeployed;
  ccipRouterMock: CCIPRouterMock;
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
  const { ayaraConfig, ayaraInstances } = getSystemConfig(hre);
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

  const ayaraControllerPrimary = await deployAyaraController(
    hre,
    signer,
    create2Factory,
    ayaraInstances.sepolia,
    { useCreate2: true, router }
  );

  const ayaraControllerOptimism = await deployAyaraController(
    hre,
    signer,
    create2Factory,
    ayaraInstances.optimism,
    { useCreate2: true, router }
  );

  const ayaraControllerBase = await deployAyaraController(
    hre,
    signer,
    create2Factory,
    ayaraInstances.base,
    { useCreate2: true, router }
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

  const mocks = await deployMocks(hre, signer, create2Factory);
  return {
    create2Factory,
    ayaraControllerPrimary: ayaraControllerPrimary,
    ayaraControllerOptimism: ayaraControllerOptimism,
    ayaraControllerBase: ayaraControllerBase,
    mocks,
    ccipRouterMock,
  };
}

export async function deployAyaraController(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  create2Factory: Create2Factory,
  ayaraInstance: { chainId: number; name: string },
  options?: {
    router?: string;
    linkToken?: string;
    useCreate2?: boolean;
  }
): Promise<AyaraController> {
  let router = options?.router || "0x000000000000000000000000000000000000dEaD";
  let linkToken =
    options?.linkToken || "0x0000000000000000000000000000000000000001";

  logger("info", "deployAyaraController", ayaraInstance.name);
  logger("info", `chainId: ${ayaraInstance.chainId}`);

  const deploymentOverrides = {
    gasPrice: hre.ethers.parseUnits("1.0", "gwei"),
  };

  const deployCreate2Options = {
    overrides: deploymentOverrides,
    create2Options: { amount: 0, salt: ayaraInstance.name, callbacks: [] },
    waitForBlocks: 0,
  };

  const withSalt = (salt: string) => ({
    ...deployCreate2Options,
    create2Options: { ...deployCreate2Options.create2Options, salt },
  });

  let ayaraController: AyaraController;

  if (!options?.useCreate2) {
    ayaraController = await deployContract<AyaraController>(
      hre,
      signer,
      "AyaraController",
      [
        await signer.getAddress(),
        hre.ethers.encodeBytes32String(ayaraInstance.name),
        ayaraInstance.chainId,
        [],
        router,
        linkToken,
      ],
      deploymentOverrides
    );

    return ayaraController;
  } else {
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
        hre.ethers.encodeBytes32String(ayaraInstance.name),
        ayaraInstance.chainId,
        [],
        router,
        linkToken,
      ],
      withSalt(ayaraInstance.name)
    );
  }

  return ayaraController;
}
