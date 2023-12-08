import type { Signer } from "ethers";

import type { AyaraWalletInstance, AyaraController } from "../typechain-types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const DOMAIN_TYPE = {
  name: "Ayara",
  version: "1",
};

const TYPES = {
  Transaction: [
    { name: "ownerAddress", type: "address" },
    { name: "controllerAddress", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes32" },
  ],
};

function generateDomainData(
  chainId: number | bigint,
  verifyingContract: string
) {
  return {
    ...DOMAIN_TYPE,
    chainId,
    verifyingContract,
  };
}

interface Message {
  ownerAddress: string;
  controllerAddress: string;
  nonce: number | bigint;
  data: string;
}

export async function generateSignature(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  ayaraWallet: AyaraWalletInstance,
  data: string,
  overrides?: any
) {
  // Check if we got a wallet or a controller

  const domain = generateDomainData(
    await ayaraWallet.chainId(),
    await ayaraWallet.getAddress()
  );
  const types = TYPES;
  let toSignMessage = {
    ownerAddress: await signer.getAddress(),
    controllerAddress: await ayaraWallet.controllerAddress(),
    nonce: await ayaraWallet.nonce(),
    data: hre.ethers.keccak256(data),
  };

  if (overrides) {
    toSignMessage = { ...toSignMessage, ...overrides };
  }

  return signer.signTypedData(domain, types, toSignMessage);
}

export async function generateSignatureForUninitializedWallet(
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  ayaraController: AyaraController,
  data: string,
  overrides?: any
) {
  const domain = generateDomainData(
    await ayaraController.chainId(),
    await ayaraController.calculateWalletAddress(await signer.getAddress())
  );
  const types = TYPES;
  let toSignMessage = {
    ownerAddress: await signer.getAddress(),
    controllerAddress: await ayaraController.getAddress(),
    nonce: 0,
    data: hre.ethers.keccak256(data),
  };

  if (overrides) {
    toSignMessage = { ...toSignMessage, ...overrides };
  }

  return signer.signTypedData(domain, types, toSignMessage);
}
