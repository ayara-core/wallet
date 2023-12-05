import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { getSystemConfig } from "../utils/deployConfig";
import { deploySystem } from "../scripts/deploy";
import { getCommonSigners } from "../utils/signers";
import { logger } from "../utils/deployUtils";
import {
  generateSignature,
  generateSignatureForUninitializedWallet,
} from "../utils/signature";

import {
  AyaraController,
  ERC20Mock,
  CCIPRouterMock,
  AyaraWalletInstance,
} from "../typechain-types";

import { createWalletAndGetAddress } from "./test-utils";
import { config } from "dotenv";

// Initialize logger for test logs
const log = logger("log", "test");

// Load system configuration
const systemConfig = getSystemConfig(hre);

// Define the test context
interface TestContext {
  alice: Signer;
  bob: Signer;
  deployer: Signer;
  relayer: Signer;
  erc20Mock: ERC20Mock;
  ayaraController: AyaraController;
  ayaraControllerBase: AyaraController;
  ayaraControllerOptimism: AyaraController;
  ccipRouterMock: CCIPRouterMock;
}

describe("AyaraController", function () {
  // This fixture deploys the contract and returns it
  const setup = async () => {
    // Get signers
    const { alice, bob, deployer, relayer } = await getCommonSigners(hre);

    const systemDeployed = await deploySystem(hre, deployer, systemConfig);
    const ayaraController =
      systemDeployed.ayaraControllerPrimary.connect(deployer);
    const ayaraControllerBase = systemDeployed.ayaraControllerBase
      ? systemDeployed.ayaraControllerBase.connect(deployer)
      : undefined;
    const ayaraControllerOptimism = systemDeployed.ayaraControllerOptimism
      ? systemDeployed.ayaraControllerOptimism.connect(deployer)
      : undefined;
    const erc20Mock = systemDeployed.mocks.erc20Mock;
    const ccipRouterMock = systemDeployed.ccipRouterMock;

    // Mint some tokens for Alice
    const aliceAddress = await alice.getAddress();
    const tx = await erc20Mock.mint(aliceAddress, ethers.parseEther("1000"));
    await tx.wait();

    return {
      alice,
      bob,
      deployer,
      relayer,
      erc20Mock,
      ayaraController,
      ayaraControllerBase,
      ayaraControllerOptimism,
      ccipRouterMock,
    };
  };
  describe("AyaraController: Crosschain Mocktest Setup, No Gas involved", async function () {
    before("Load fixtures", async function () {
      Object.assign(this, await loadFixture(setup));
    });
    it("Should successfully deploy AyaraController Main", async function () {
      const { ayaraController, ayaraControllerBase, ayaraControllerOptimism } =
        this as any as TestContext;

      // Get Addresses
      const ayaraControllerAddress = await ayaraController.getAddress();
      const ayaraControllerBaseAddress = await ayaraControllerBase.getAddress();
      const ayaraControllerOptimismAddress =
        await ayaraControllerOptimism.getAddress();

      expect(ayaraControllerAddress).to.be.properAddress;
      expect(ayaraControllerBaseAddress).to.be.properAddress;
      expect(ayaraControllerOptimismAddress).to.be.properAddress;

      log(`AyaraController Main: ${ayaraControllerAddress}`);
      log(`AyaraController Base: ${ayaraControllerBaseAddress}`);
      log(`AyaraController Optimism: ${ayaraControllerOptimismAddress}`);
    });
    it("Should successfully set the chainId", async function () {
      const { ayaraController, ayaraControllerBase, ayaraControllerOptimism } =
        this as any as TestContext;
      // Get the chainId from the config
      const config = getSystemConfig(hre);

      // Get the chainId from the contract
      const chainIdPrimary = await ayaraController.chainId();
      const chainIdBase = await ayaraControllerBase.chainId();
      const chainIdOptimism = await ayaraControllerOptimism.chainId();

      // Compare the chainIds
      expect(chainIdPrimary).to.equal(config.ayaraInstances.sepolia.chainId);
      expect(chainIdBase).to.equal(config.ayaraInstances.base.chainId);
      expect(chainIdOptimism).to.equal(config.ayaraInstances.optimism.chainId);

      // Log the chainIds
      log(`ChainId Main: ${chainIdPrimary}`);
      log(`ChainId Base: ${chainIdBase}`);
      log(`ChainId Optimism: ${chainIdOptimism}`);
    });
    it("Should create a new wallet for Alice in each chain and have different addresses", async function () {
      const {
        alice,
        ayaraController,
        ayaraControllerBase,
        ayaraControllerOptimism,
      } = this;

      const aliceAddress = await alice.getAddress();

      // Create wallet in Main
      const tx = await ayaraController.createWallet(aliceAddress, []);
      const receipt = await tx.wait();
      const walletAddressMain = await ayaraController.wallets(aliceAddress);

      // Create wallet in Base
      const txBase = await ayaraControllerBase.createWallet(aliceAddress, []);
      const receiptBase = await txBase.wait();
      const walletAddressBase = await ayaraControllerBase.wallets(aliceAddress);

      // Create wallet in Optimism
      const txOptimism = await ayaraControllerOptimism.createWallet(
        aliceAddress,
        []
      );
      const receiptOptimism = await txOptimism.wait();
      const walletAddressOptimism =
        await ayaraControllerOptimism.wallets(aliceAddress);

      // Compare the wallet addresses
      expect(walletAddressMain).to.be.properAddress;
      expect(walletAddressBase).to.be.properAddress;
      expect(walletAddressOptimism).to.be.properAddress;

      expect(walletAddressMain).to.not.equal(walletAddressBase);
      expect(walletAddressBase).to.not.equal(walletAddressOptimism);
      expect(walletAddressOptimism).to.not.equal(walletAddressMain);

      // Log the wallet addresses
      log(`Wallet Main: ${walletAddressMain}`);
      log(`Wallet Base: ${walletAddressBase}`);
      log(`Wallet Optimism: ${walletAddressOptimism}`);
    });
    it("Should successfully send a transaction from Controller A to Controller B", async function () {
      // Assumptions:
      // - Wallet A exists on Main
      // - Wallet B does not exist on Base
      // Test Steps:
      // 1. Controller A receives a transaction
      // 2. Controller A relays the transaction to the CCIP Mock
      // 3. Controller B receives the relayed transaction from the CCIP Mock
      // 4. Controller B creates Wallet B and sends the received transaction to it

      const {
        alice,
        ayaraController,
        ayaraControllerOptimism,
        erc20Mock,
        ccipRouterMock,
      } = this as any as TestContext;

      const config = getSystemConfig(hre);

      // Get the addresses
      const aliceAddress = await alice.getAddress();
      const createWalletTx = await ayaraController.createWallet(
        aliceAddress,
        []
      );
      const createWalletReceipt = await createWalletTx.wait();
      expect(createWalletReceipt?.status).to.equal(1);

      const walletAddressMain = await ayaraController.wallets(aliceAddress);

      expect(walletAddressMain).to.not.equal(ethers.ZeroAddress);
      log(`Wallet Main: ${walletAddressMain}`);

      // Generate a signature
      const data = erc20Mock.interface.encodeFunctionData("approve", [
        aliceAddress,
        100,
      ]);
      const signature = await generateSignatureForUninitializedWallet(
        alice,
        ayaraControllerOptimism,
        data
      );

      // Send the transaction
      const feeData = {
        token: ethers.ZeroAddress, // Fee Token
        maxFee: 0, // Fee Amount
        relayerFee: 0, // Relayer Fee
      };

      const transaction = {
        destinationChainId: config.ayaraInstances.optimism.chainId, // Destination ChainId
        to: await erc20Mock.getAddress(), // Destination Contract
        value: 0, // Value
        data: data, // Data
        signature: signature, // Signature
      };

      const tx = ayaraController.executeUserOperation(
        aliceAddress,
        walletAddressMain,
        feeData,
        transaction
      );

      await expect(tx)
        .to.emit(ayaraController, "MessageSent")
        .and.to.emit(ccipRouterMock, "MessageSent")
        .and.to.emit(ayaraControllerOptimism, "MessageReceived")
        .and.to.emit(ayaraControllerOptimism, "WalletCreated");
    });
    it("Should have set the allowance of Gas correctly to 0", async function () {
      // We should see here that the gas allowance is set correctly
      // Wallet Main: Has now locked amount of gas
      // Wallet Optimism: Has now total amount of gas
      const { alice, ayaraController, ayaraControllerOptimism, erc20Mock } =
        this as any as TestContext;

      const aliceAddress = await alice.getAddress();
      const tokenAddress = await erc20Mock.getAddress();
      const walletAddressMain = await ayaraController.wallets(aliceAddress);
      const walletAddressOptimism =
        await ayaraControllerOptimism.wallets(aliceAddress);

      const gasDataMain = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );

      const gasDataOpti = await ayaraControllerOptimism.getUserGasData(
        aliceAddress,
        tokenAddress
      );

      expect(gasDataMain.lockedAmount).to.equal(0);
      expect(gasDataMain.totalAmount).to.equal(0);
      expect(gasDataMain.usedAmount).to.equal(0);

      expect(gasDataOpti.lockedAmount).to.equal(0);
      expect(gasDataOpti.totalAmount).to.equal(0);
      expect(gasDataOpti.usedAmount).to.equal(0);
    });
  });
  describe.only("AyaraController: Crosschain Mocktest Send Tx", async function () {
    before("Load fixtures", async function () {
      Object.assign(this, await loadFixture(setup));
    });
    it("Should approve Mock to be used as fee token on Main", async function () {
      const { deployer, erc20Mock, ayaraController } =
        this as any as TestContext;

      const tokenAddress = await erc20Mock.getAddress();

      const tx = ayaraController.modifyGasTokens([tokenAddress], true);
      await expect(tx)
        .to.emit(ayaraController, "GasTokensModified")
        .withArgs([tokenAddress], true);

      const isTokenAllowed = await ayaraController.isGasToken(tokenAddress);
      expect(isTokenAllowed).to.be.true;
    });
    it("Should approve Mock to be used as fee token on Optimism", async function () {
      const { deployer, erc20Mock, ayaraControllerOptimism } =
        this as any as TestContext;

      const tokenAddress = await erc20Mock.getAddress();

      const tx = ayaraControllerOptimism.modifyGasTokens([tokenAddress], true);
      await expect(tx)
        .to.emit(ayaraControllerOptimism, "GasTokensModified")
        .withArgs([tokenAddress], true);

      const isTokenAllowed =
        await ayaraControllerOptimism.isGasToken(tokenAddress);
      expect(isTokenAllowed).to.be.true;
    });
    it("Should lock and update usergas on Main chain", async function () {
      const { alice, ayaraController, erc20Mock } = this as any as TestContext;

      const aliceAddress = await alice.getAddress();
      const tokenAddress = await erc20Mock.getAddress();

      const gasDataMain = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataMain.lockedAmount).to.equal(0);
      expect(gasDataMain.totalAmount).to.equal(0);
      expect(gasDataMain.usedAmount).to.equal(0);

      const totalAmount = ethers.parseEther("1");

      // Set erc20Mock allowance
      const txApprove = await erc20Mock
        .connect(alice)
        .approve(await ayaraController.getAddress(), totalAmount);
      await txApprove.wait();

      // Let's lock some gas
      const tx = ayaraController.addFundsToWallet(
        aliceAddress,
        tokenAddress,
        totalAmount
      );

      await expect(tx)
        .to.emit(ayaraController, "WalletGasFunded")
        .withArgs(aliceAddress, tokenAddress, totalAmount);

      const gasDataMainAfter = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataMainAfter.lockedAmount).to.equal(0);
      expect(gasDataMainAfter.totalAmount).to.equal(totalAmount);
      expect(gasDataMainAfter.usedAmount).to.equal(0);

      log(`Total Amount: ${gasDataMainAfter.totalAmount}`);
    });
    it("Should use gas on Main chain and update usergas", async function () {
      const { alice, ayaraController, erc20Mock } = this as any as TestContext;

      const config = getSystemConfig(hre);

      const aliceAddress = await alice.getAddress();
      const tokenAddress = await erc20Mock.getAddress();

      const walletAddressMain = await ayaraController.wallets(aliceAddress);

      const gasDataMain = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataMain.lockedAmount).to.equal(0);
      expect(gasDataMain.totalAmount).to.equal(ethers.parseEther("1"));
      expect(gasDataMain.usedAmount).to.equal(0);

      const ayaraWalletInstance = (
        await ethers.getContractAt("AyaraWalletInstance", walletAddressMain)
      ).connect(alice);

      // Let's use some gas
      const data = erc20Mock.interface.encodeFunctionData("approve", [
        aliceAddress,
        100,
      ]);

      const signature = await generateSignature(
        alice,
        ayaraWalletInstance,
        data
      );

      const feeData = {
        token: tokenAddress, // Fee Token
        maxFee: 1000, // Fee Amount
        relayerFee: 100, // Relayer Fee
      };

      const transaction = {
        destinationChainId: config.ayaraInstances.sepolia.chainId, // Destination ChainId
        to: tokenAddress, // Destination Contract
        value: 0, // Value
        data: data, // Data
        signature: signature, // Signature
      };

      const tx = ayaraController.executeUserOperation(
        aliceAddress,
        walletAddressMain,
        feeData,
        transaction
      );

      await expect(tx)
        .to.emit(ayaraController, "WalletGasCharged")
        .withArgs(aliceAddress, tokenAddress, 1000, 100);

      const gasDataMainAfter = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );

      log(`Used Amount: ${gasDataMainAfter.usedAmount}`);
      expect(gasDataMainAfter.lockedAmount).to.equal(0);
      expect(gasDataMainAfter.totalAmount).to.equal(ethers.parseEther("1"));
      expect(gasDataMainAfter.usedAmount).to.equal(100);
    });
    it("Should lock gas on Main chain and create allowance on Optimism chain", async function () {
      const { alice, ayaraController, ayaraControllerOptimism, erc20Mock } =
        this as any as TestContext;

      const config = getSystemConfig(hre);

      const aliceAddress = await alice.getAddress();
      const tokenAddress = await erc20Mock.getAddress();

      const walletAddressMain = await ayaraController.wallets(aliceAddress);
      const walletAddressOptimism =
        await ayaraControllerOptimism.wallets(aliceAddress);

      const gasDataOpti = await ayaraControllerOptimism.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataOpti.lockedAmount).to.equal(0);
      expect(gasDataOpti.totalAmount).to.equal(0);
      expect(gasDataOpti.usedAmount).to.equal(0);

      // Execute a transaction on Main to Optimism
      const data = erc20Mock.interface.encodeFunctionData("approve", [
        aliceAddress,
        100,
      ]);

      const signature = await generateSignatureForUninitializedWallet(
        alice,
        ayaraControllerOptimism,
        data
      );

      const feeData = {
        token: tokenAddress, // Fee Token
        maxFee: 1000, // Fee Amount
        relayerFee: 100, // Relayer Fee
      };

      const transaction = {
        destinationChainId: config.ayaraInstances.optimism.chainId, // Destination ChainId
        to: tokenAddress, // Destination Contract
        value: 0, // Value
        data: data, // Data
        signature: signature, // Signature
      };

      const tx = ayaraController.executeUserOperation(
        aliceAddress,
        walletAddressMain,
        feeData,
        transaction
      );

      await expect(tx)
        .to.emit(ayaraController, "WalletGasCharged")
        .withArgs(aliceAddress, tokenAddress, 1000, 100)
        .and.to.emit(ayaraController, "OperationExecutionSent")
        .and.to.emit(ayaraController, "MessageSent")
        .and.to.emit(ayaraController, "WalletGasLocked")
        .and.to.emit(ayaraControllerOptimism, "MessageReceived")
        .and.to.emit(ayaraControllerOptimism, "WalletCreated")
        .and.to.emit(ayaraControllerOptimism, "WalletGasFunded")
        .and.to.emit(ayaraControllerOptimism, "OperationExecuted");
    });
  });
});
