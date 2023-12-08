import { ethers } from "hardhat";
import { Signer, EventLog, Log } from "ethers";

import { AyaraController, AyaraWalletInstance } from "../../typechain-types";

export async function createWalletAndGetAddress(
  controller: AyaraController,
  signer: Signer
) {
  const signerAddress = await signer.getAddress();
  const controllerInstance = controller.connect(signer);
  const tx = await controllerInstance.createWallet(signerAddress, []);
  const receipt = await tx.wait();

  const walletCreatedEvent = receipt?.logs?.find((e: EventLog | Log) => {
    return e.topics[0] === ethers.id("WalletCreated(address,address)");
  }) as EventLog;

  let walletAddress = "";
  if (walletCreatedEvent) {
    walletAddress = walletCreatedEvent.args[1];
  }

  const walletInstance = await ethers.getContractAt(
    "AyaraWalletInstance",
    walletAddress
  );

  return { walletAddress, walletInstance };
}
