import type { Signer } from "ethers";
import { ethers } from "hardhat";

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
  verifyingContract: string,
  message: Message
) {
  const domain = generateDomainData(chainId, verifyingContract);
  const types = TYPES;
  const toSignMessage = {
    ...message,
    data: ethers.keccak256(message.data),
  };

  return signer.signTypedData(domain, types, toSignMessage);
}
