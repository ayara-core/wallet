import type { Signer } from "ethers";
import { ethers } from "hardhat";

import type { AyaraWalletInstance } from "../typechain-types";

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
  signer: Signer,
  chainId: number | bigint,
  ayaraWalletInstance: AyaraWalletInstance,
  data: string,
  overrides?: any
) {
  const domain = generateDomainData(
    chainId,
    await ayaraWalletInstance.getAddress()
  );
  const types = TYPES;
  let toSignMessage = {
    ownerAddress: await signer.getAddress(),
    controllerAddress: await ayaraWalletInstance.controllerAddress(),
    nonce: await ayaraWalletInstance.nonce(),
    data: ethers.keccak256(data),
  };

  if (overrides) {
    toSignMessage = { ...toSignMessage, ...overrides };
  }

  return signer.signTypedData(domain, types, toSignMessage);
}
