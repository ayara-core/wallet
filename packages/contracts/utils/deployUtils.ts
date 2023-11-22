import {
  BytesLike,
  Contract,
  ContractFactory,
  EventLog,
  Overrides,
  ethers,
  getAddress,
  resolveAddress,
  solidityPackedKeccak256,
  type BaseContract,
  type Signer,
} from "ethers";

import debug from "debug";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { Create2Factory } from "../typechain-types";
import { saveAddress, getDeployedAddress } from "./saveAddress";

interface Create2Options {
  amount?: number;
  salt?: string;
  callbacks?: BytesLike[];
}

interface DeployCreate2Options {
  overrides?: Overrides;
  create2Options?: Create2Options;
  waitForBlocks?: number | undefined;
}
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const logger = (...args: string[]) => debug(`packd:${args.join(":")}`);

const log = logger("log", "deploy");

export const deployContract = async <T extends BaseContract>(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  contractName: string,
  constructorArguments: any[],
  overrides = {}
): Promise<T> => {
  const contractInstance = await hre.ethers.getContractFactory(contractName, {
    signer,
  });

  // Check if contract is already deployed, but only for non-local networks
  const deployedAddress = await getDeployedAddress(hre, contractName);
  if (
    deployedAddress &&
    hre.network.name !== "hardhat" &&
    hre.network.name !== "localhost"
  ) {
    log(`Contract ${contractName} already deployed to ${deployedAddress}`);
    const contract = contractInstance.attach(deployedAddress) as T;
    return contract;
  }

  // If Mantle testnet, set gas limit to 0x1000000 (workaround)
  if (hre.network.name === "mantleTestnet") {
    overrides = {
      gasLimit: "0x1000000",
    };
  }

  const contract = (await contractInstance.deploy(
    ...constructorArguments,
    overrides
  )) as unknown as T;
  await contract.waitForDeployment();
  const abiEncodedConstructorArgs =
    contract.interface.encodeDeploy(constructorArguments);

  log(`Deployed ${contractName} to ${await contract.getAddress()}`);
  await saveAddress(hre, contract, contractName);

  // Verify the contract on Etherscan if not local network
  if (
    hre.network.name !== "hardhat" &&
    hre.network.name !== "localhost"
    // hre.network.name !== "scrollSepolia" &&
    // hre.network.name !== "polygonZkEVMTestnet"
    // hre.network.name !== "mantleTestnet"
  ) {
    await hre.run("verify:verify", {
      address: await contract.getAddress(),
      constructorArguments: [...constructorArguments],
    });
  }
  if (constructorArguments.length > 0)
    log(`ABI encoded args: ${abiEncodedConstructorArgs.slice(2)}`);

  return contract;
};
export interface ContractFactoryConstructor<C extends Contract> {
  new (signer?: Signer): ContractFactory<Array<any>, C>;
}

export const deployContractWithCreate2 = async <
  T extends BaseContract,
  F extends ContractFactory, //<Array<any>, T>
>(
  hre: HardhatRuntimeEnvironment,
  contractFactory: F,
  create2Factory: Create2Factory,
  contractName: string,
  constructorArgs: Array<unknown> = [],
  options: DeployCreate2Options = {
    overrides: {},
    create2Options: { amount: 0, salt: undefined, callbacks: [] },
    waitForBlocks: undefined,
  }
): Promise<T> => {
  let { overrides, create2Options, waitForBlocks } = options;

  const salt = create2Options?.salt ?? contractName;

  log("deployContractWithCreate2", contractName, "salt", salt);

  const deployerAddress = await resolveAddress(create2Factory.target);
  const unsignedTx = await contractFactory.getDeployTransaction(
    ...constructorArgs,
    overrides ?? {}
  );

  const create2Salt = solidityPackedKeccak256(["string"], [salt]);
  const contractAddress = _computeCreate2Address(
    deployerAddress,
    create2Salt,
    unsignedTx.data
  );

  if (hre.network.name === "mantleTestnet") {
    overrides = {
      ...overrides,
      gasLimit: "0x1000000",
    };
  }

  const deployTransaction = await create2Factory.deploy(
    create2Options?.amount ?? 0,
    create2Salt,
    unsignedTx.data,
    (create2Options?.callbacks ?? []) as unknown as any[],
    overrides ?? {}
  );

  const receipt = await deployTransaction.wait(waitForBlocks);
  if (receipt == null) throw Error("Create2Factory error");

  const deployedEvent = receipt.logs.find((e) => {
    return (
      e.topics[0] ===
      ethers.keccak256(ethers.toUtf8Bytes("Deployed(bytes32,address)"))
    );
  }) as EventLog;
  const deployedAddress = deployedEvent.args["deployed"];
  if (deployedAddress.toLowerCase() !== contractAddress.toLowerCase())
    throw new Error(
      `Deployed address ${deployedAddress}, expected address ${contractAddress}`
    );

  const contract = new ethers.Contract(
    contractAddress,
    contractFactory.interface
  ).connect(contractFactory.runner) as T;

  const abiEncodedConstructorArgs =
    contract.interface.encodeDeploy(constructorArgs);
  log(`ABI encoded args: ${abiEncodedConstructorArgs.slice(2)}`);

  await saveAddress(hre, contract, contractName);
  return contract;
};
function _computeCreate2Address(
  deployerAddress: string,
  salt: string,
  bytecode: BytesLike
): string {
  return getAddress(
    "0x" +
      solidityPackedKeccak256(
        ["bytes"],
        [
          `0xff${deployerAddress.slice(2)}${salt.slice(
            2
          )}${solidityPackedKeccak256(["bytes"], [bytecode]).slice(2)}`,
        ]
      ).slice(-40)
  );
}
