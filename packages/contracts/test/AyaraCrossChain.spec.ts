import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { getSystemConfig } from "../utils/deployConfig";
import { deploySystem } from "../scripts/deploy";
import { getCommonSigners } from "../utils/signers";
import { logger } from "../utils/deployUtils";
import {
  generateSignature,
  generateSignatureForUninitializedWallet,
} from "../utils/signature";

import { createWalletAndGetAddress } from "./test-utils";
import { config } from "dotenv";

// Initialize logger for test logs
const log = logger("log", "test");

// Load system configuration
const systemConfig = getSystemConfig(hre);

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
  describe("AyaraController: Crosschain Mocktest Setup", async function () {
    before("Load fixtures", async function () {
      Object.assign(this, await loadFixture(setup));
    });
    it("Should successfully deploy AyaraController Main", async function () {
      const { ayaraController, ayaraControllerBase, ayaraControllerOptimism } =
        this;

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
        this;
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
  });
  describe("AyaraController: Crosschain Mocktest Send Tx", async function () {
    before("Load fixtures", async function () {
      Object.assign(this, await loadFixture(setup));
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
      } = this;

      const config = getSystemConfig(hre);

      // Get the addresses
      const aliceAddress = await alice.getAddress();
      const walletAddressMain = await ayaraController.wallets(aliceAddress);

      // Generate a signature
      const data = await erc20Mock.interface.encodeFunctionData("approve", [
        aliceAddress,
        100,
      ]);
      const signature = await generateSignatureForUninitializedWallet(
        alice,
        ayaraController,
        data
      );

      // Send the transaction
      const tx = ayaraController.executeUserOperation(
        aliceAddress,
        walletAddressMain,
        ethers.ZeroAddress, // Fee Token
        0, // Fee Amount
        config.ayaraInstances.optimism.chainId, // Destination ChainId
        await erc20Mock.getAddress(), // Destination Contract
        0, // Value
        data, // Data
        signature // Signature
      );
      await expect(tx)
        .to.emit(ayaraController, "MessageSent")
        .and.to.emit(ccipRouterMock, "MessageSent")
        .and.to.emit(ayaraControllerOptimism, "MessageReceived")
        .and.to.emit(ayaraControllerOptimism, "WalletCreated");
    });
  });
});
