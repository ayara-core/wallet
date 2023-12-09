import { subtask, task, types } from "hardhat/config";
import {
  generateSignature,
  generateSignatureForUninitializedWallet,
} from "../utils/signature";

import { logger } from "../utils/deployUtils";
import { getDeployedAddress } from "../utils/saveAddress";
const log = logger("log", "task");

task("createwallet:ayara", "Just creates a wallet").setAction(
  async (args, hre) => {
    log("createwallet:ayara");

    const deployer = await hre.ethers.provider.getSigner();
    const ayaraControllerAddress = await getDeployedAddress(
      hre,
      "AyaraController"
    );
    const ayaraController = await hre.ethers.getContractAt(
      "AyaraController",
      ayaraControllerAddress,
      deployer
    );

    const walletAddress = await ayaraController.calculateWalletAddress(
      await deployer.getAddress()
    );
    log(`Wallet address should be: ${walletAddress}`);

    const tx = await ayaraController.createWallet(
      await deployer.getAddress(),
      []
    );
    log(`Transaction hash: ${tx.hash}`);
    await tx.wait();

    log(`Wallet created!`);
  }
);

task(
  "initiate:ayara",
  "Initialises an Account for Ayara, Stakes Gastoken and creates wallet"
)
  .addParam("amount", "Amount of gas token to stake", undefined, types.int)
  .setAction(async (args, hre) => {
    log("initiate:ayara");

    if (args.amount === undefined) {
      throw new Error("Amount is undefined");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const deployer = await hre.ethers.provider.getSigner();

    // Get the ayara controller address and instance
    const ayaraControllerAddress = await getDeployedAddress(
      hre,
      "AyaraController"
    );
    const ayaraController = await hre.ethers.getContractAt(
      "AyaraController",
      ayaraControllerAddress,
      deployer
    );
    log(`AyaraController: ${ayaraControllerAddress}`);

    // Get link token address
    const linkTokenAddress = await ayaraController.link();
    const linkToken = await hre.ethers.getContractAt(
      "ERC20",
      linkTokenAddress,
      deployer
    );
    log(`LinkToken: ${linkTokenAddress}`);

    // Check if approved already
    const approved = await linkToken.allowance(
      deployer.address,
      ayaraControllerAddress
    );

    if (approved > hre.ethers.parseEther(args.amount.toString())) {
      log(`Already approved`);
      return;
    } else {
      // Set approval for ayara controller to spend link token
      log(`Approving AyaraController to spend ${args.amount} LinkToken`);
      const tx = await linkToken.approve(
        ayaraControllerAddress,
        hre.ethers.parseEther(args.amount.toString())
      );
      log(`Transaction hash: ${tx.hash}`);
      await tx.wait();
      log(`Approved!`);
    }

    // Get precalcualted wallet address
    const walletAddress = await ayaraController.calculateWalletAddress(
      await deployer.getAddress()
    );
    log(`Wallet address should be: ${walletAddress}`);

    const tx2 = await ayaraController.addFundsToWallet(
      await deployer.getAddress(),
      linkTokenAddress,
      hre.ethers.parseEther(args.amount.toString())
    );
    log(`Transaction hash: ${tx2.hash}`);
    await tx2.wait();

    log(`Link staked and Wallet created!`);
  });

task("send:erc20:signer")
  .addParam("amount", "Amount of ERC20 to send", undefined, types.int)
  .addParam("tokenaddress", "Address of the ERC20", undefined, types.string)
  .addParam("to", "Address to send the ERC20 to", undefined, types.string)
  .setAction(async (args, hre) => {
    log("send:erc20:signer");

    if (args.amount === undefined) {
      throw new Error("Amount is undefined");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const deployer = await hre.ethers.provider.getSigner();

    const token = await hre.ethers.getContractAt(
      "ERC20",
      args.tokenaddress,
      deployer
    );

    const tx = await token.transfer(
      args.to,
      hre.ethers.parseEther(args.amount.toString())
    );
    log(`Transaction hash: ${tx.hash}`);
    await tx.wait();

    log(`ERC20 sent!`);
  });

task("send:erc20:fromwallet")
  .addParam("amount", "Amount of ERC20 to send", undefined, types.int)
  .addParam("tokenaddress", "Address of the ERC20", undefined, types.string)
  .addParam("to", "Address to send the ERC20 to", undefined, types.string)
  .setAction(async (args, hre) => {
    log("send:erc20:fromwallet");

    if (args.amount === undefined) {
      throw new Error("Amount is undefined");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const deployer = await hre.ethers.provider.getSigner();
    const ayaraControllerAddress = await getDeployedAddress(
      hre,
      "AyaraController"
    );
    const ayaraController = await hre.ethers.getContractAt(
      "AyaraController",
      ayaraControllerAddress,
      deployer
    );

    const token = await hre.ethers.getContractAt(
      "ERC20",
      args.tokenaddress,
      deployer
    );

    const walletAddress = await ayaraController.wallets(
      await deployer.getAddress()
    );
    const walletInstance = await hre.ethers.getContractAt(
      "AyaraWalletInstance",
      walletAddress,
      deployer
    );

    const data = token.interface.encodeFunctionData("transfer", [
      args.to,
      hre.ethers.parseEther(args.amount.toString()),
    ]);
    const signature = await generateSignature(
      hre,
      deployer,
      walletInstance,
      data
    );
    const feeData = {
      tokenSource: args.tokenaddress,
      tokenDestination: args.tokenaddress,
      maxFee: hre.ethers.parseEther("0"),
      relayerFee: hre.ethers.parseEther("0"),
    };
    const transaction = {
      destinationChainId: hre.network.config.chainId ?? 31337,
      to: args.tokenaddress,
      value: 0,
      data: data,
      signature: signature,
    };

    log(`Sending ${args.amount} ERC20 to ${args.to}`);

    const tx = await ayaraController.executeUserOperation(
      await deployer.getAddress(),
      walletAddress,
      feeData,
      transaction
    );
    log(`Transaction hash: ${tx.hash}`);
    await tx.wait();

    log(`ERC20 sent!`);
  });

task("send:crosschain:erc20approve")
  .addParam(
    "destinationid",
    "Send to destination chain id",
    undefined,
    types.int
  )
  .addParam(
    "destinationaddress",
    "Send to destination address",
    undefined,
    types.string
  )
  .setAction(async (args, hre) => {
    log("send:crosschain:erc20approve");

    const deployer = await hre.ethers.provider.getSigner();

    const ayaraControllerAddress = await getDeployedAddress(
      hre,
      "AyaraController"
    );

    const ayaraController = await hre.ethers.getContractAt(
      "AyaraController",
      ayaraControllerAddress,
      deployer
    );

    const walletAddress = await ayaraController.wallets(
      await deployer.getAddress()
    );

    const walletInstance = await hre.ethers.getContractAt(
      "AyaraWalletInstance",
      walletAddress,
      deployer
    );

    // Get interface
    const erc20 = await hre.ethers.getContractAt(
      "ERC20",
      args.destinationaddress,
      deployer
    );

    const data = erc20.interface.encodeFunctionData("approve", [
      "0x6D0F8D488B669aa9BA2D0f0b7B75a88bf5051CD3",
      hre.ethers.parseEther("1"),
    ]);

    const signature = await generateSignature(
      hre,
      deployer,
      walletInstance,
      data
    );

    const linkTokenAddress = await ayaraController.link();

    const feeData = {
      tokenSource: linkTokenAddress,
      tokenDestination: "0x6D0F8D488B669aa9BA2D0f0b7B75a88bf5051CD3",
      maxFee: hre.ethers.parseEther("1"),
      relayerFee: hre.ethers.parseEther("0"),
    };

    const transaction = {
      destinationChainId: args.destinationid,
      to: args.destinationaddress,
      value: 0,
      data: data,
      signature: signature,
    };

    log(`Approving ${args.destinationaddress} on ${args.destinationid}`);
    const transactionData = ayaraController.interface.encodeFunctionData(
      "executeUserOperation",
      [await deployer.getAddress(), walletAddress, feeData, transaction]
    );

    log(`Transaction data: `);
    log(transactionData);
    const tx = await ayaraController.executeUserOperation(
      await deployer.getAddress(),
      walletAddress,
      feeData,
      transaction
    );

    log(`Transaction hash: ${tx.hash}`);
    await tx.wait();

    log(`ERC20 approve message sent!`);
  });
