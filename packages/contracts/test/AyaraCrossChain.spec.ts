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

const DEFAULT_CHAIN_ID = 31337;

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

    const systemDeployed = await deploySystem(hre, deployer);
    const ayaraController =
      systemDeployed.ayaraControllerPrimary.connect(deployer);
    const ayaraControllerBase = systemDeployed.ayaraControllerBase
      ? systemDeployed.ayaraControllerBase.connect(deployer)
      : undefined;
    const ayaraControllerOptimism = systemDeployed.ayaraControllerOptimism
      ? systemDeployed.ayaraControllerOptimism.connect(deployer)
      : undefined;
    const erc20Mock = systemDeployed?.mocks?.erc20Mock;
    const ccipRouterMock = systemDeployed.ccipRouterMock;

    // Set the addresses for CCIPRouterMock
    const ayaraControllerAddress = await ayaraController.getAddress();
    const ayaraControllerBaseAddress = ayaraControllerBase
      ? await ayaraControllerBase.getAddress()
      : undefined;
    const ayaraControllerOptimismAddress = ayaraControllerOptimism
      ? await ayaraControllerOptimism.getAddress()
      : undefined;

    const deployConfig = getSystemConfig(hre);

    const tx = await ccipRouterMock?._mockSetChainSelectorsToContracts(
      [
        deployConfig.ayaraInstances.sepolia.chainId,
        deployConfig.ayaraInstances.base.chainId,
        deployConfig.ayaraInstances.optimism.chainId,
      ],
      [
        ayaraControllerAddress,
        ayaraControllerBaseAddress ?? hre.ethers.ZeroAddress,
        ayaraControllerOptimismAddress ?? hre.ethers.ZeroAddress,
      ]
    );

    const receipt = await tx?.wait();

    // Mint some tokens for Alice
    const aliceAddress = await alice.getAddress();
    const tx2 = await erc20Mock?.mint(aliceAddress, ethers.parseEther("1000"));
    await tx2?.wait();

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
      } = this as any as TestContext;

      const aliceAddress = await alice.getAddress();

      // Create wallet in Main
      const tx = await ayaraController.createWallet(aliceAddress, []);
      const receipt = await tx.wait();
      const walletAddressMain = await ayaraController.wallets(aliceAddress);

      // Create wallet in Base
      const txBase = await ayaraControllerBase.createWallet(aliceAddress, []);
      const receiptBase = await txBase.wait();
      const walletAddressBase = await ayaraControllerBase.wallets(aliceAddress);

      // Compare the wallet addresses
      expect(walletAddressMain).to.be.properAddress;
      expect(walletAddressBase).to.be.properAddress;
      expect(walletAddressMain).to.not.equal(walletAddressBase);

      // Log the wallet addresses
      log(`Wallet Main: ${walletAddressMain}`);
      log(`Wallet Base: ${walletAddressBase}`);
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
      const walletAddressMain = await ayaraController.wallets(aliceAddress);
      const tokenAddress = await erc20Mock.getAddress();

      expect(walletAddressMain).to.not.equal(ethers.ZeroAddress);
      log(`Wallet Main: ${walletAddressMain}`);

      // Generate a signature
      const data = erc20Mock.interface.encodeFunctionData("approve", [
        aliceAddress,
        100,
      ]);
      const signature = await generateSignatureForUninitializedWallet(
        hre,
        alice,
        ayaraControllerOptimism, // We need to use the main controller, since the wallet is known to have the default chainId
        data,
        {},
        {
          chainId: DEFAULT_CHAIN_ID,
        }
      );

      // Allow the token to be used as fee token
      const txApprove = await ayaraController.modifyGasTokens(
        [tokenAddress],
        true
      );
      await txApprove.wait();

      // Allow token to be used as fee token on Optimism
      const txApproveOptimism = await ayaraControllerOptimism.modifyGasTokens(
        [tokenAddress],
        true
      );
      await txApproveOptimism.wait();

      // Send the transaction
      const feeData = {
        tokenSource: tokenAddress, // Fee Token
        tokenDestination: tokenAddress, // Fee Token
        maxFee: ethers.parseEther("1"), // Fee Amount
        relayerFee: 0, // Relayer Fee
        ccipGasLimit: 0, // CCIP Gas Limit
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
  describe("AyaraController: Crosschain Mocktest Send Tx", async function () {
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
        hre,
        alice,
        ayaraWalletInstance,
        data
      );

      const feeData = {
        tokenSource: tokenAddress, // Fee Token
        tokenDestination: tokenAddress, // Fee Token
        maxFee: 1000, // Fee Amount
        relayerFee: 100, // Relayer Fee
        ccipGasLimit: 0, // CCIP Gas Limit
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
        hre,
        alice,
        ayaraControllerOptimism,
        data,
        {},
        {
          chainId: DEFAULT_CHAIN_ID,
        }
      );

      const feeData = {
        tokenSource: tokenAddress, // Fee Token
        tokenDestination: tokenAddress, // Fee Token
        maxFee: 1000, // Fee Amount
        relayerFee: 100, // Relayer Fee
        ccipGasLimit: 0, // CCIP Gas Limit
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
    it("Should be able to use gas on Optimism chain", async function () {
      const { alice, ayaraControllerOptimism, erc20Mock } =
        this as any as TestContext;

      const config = getSystemConfig(hre);

      const aliceAddress = await alice.getAddress();
      const tokenAddress = await erc20Mock.getAddress();

      const walletAddressOptimism =
        await ayaraControllerOptimism.wallets(aliceAddress);

      const walletInstanceOptimism = (
        await ethers.getContractAt("AyaraWalletInstance", walletAddressOptimism)
      ).connect(alice);

      const gasDataOpti = await ayaraControllerOptimism.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      log("Gas Data on Optimism chain before: ", gasDataOpti);

      const data = erc20Mock.interface.encodeFunctionData("approve", [
        aliceAddress,
        100,
      ]);

      const signature = await generateSignature(
        hre,
        alice,
        walletInstanceOptimism,
        data
      );

      const feeData = {
        tokenSource: tokenAddress, // Fee Token
        tokenDestination: tokenAddress, // Fee Token
        maxFee: 1000, // Fee Amount
        relayerFee: 100, // Relayer Fee
        ccipGasLimit: 0, // CCIP Gas Limit
      };

      const transaction = {
        destinationChainId: config.ayaraInstances.optimism.chainId, // Destination ChainId
        to: tokenAddress, // Destination Contract
        value: 0, // Value
        data: data, // Data
        signature: signature, // Signature
      };

      const tx = ayaraControllerOptimism.executeUserOperation(
        aliceAddress,
        walletAddressOptimism,
        feeData,
        transaction
      );

      await expect(tx)
        .to.emit(ayaraControllerOptimism, "WalletGasCharged")
        .withArgs(aliceAddress, tokenAddress, 1000, 100)
        .and.to.emit(ayaraControllerOptimism, "OperationExecuted")
        .and.to.emit(erc20Mock, "Approval");

      // Check if gas is used
      const gasDataOptiAfter = await ayaraControllerOptimism.getUserGasData(
        aliceAddress,
        tokenAddress
      );

      log("Gas Data on Optimism chain after: ", gasDataOptiAfter);

      expect(gasDataOptiAfter.usedAmount).to.equal(100);
    });
    it("Should be able to settle gas on Optimism chain and unlock on Main chain", async function () {
      const { alice, ayaraController, ayaraControllerOptimism, erc20Mock } =
        this as any as TestContext;

      const config = getSystemConfig(hre);

      const amountAvailableBefore = 333333333333333300n;

      const aliceAddress = await alice.getAddress();
      const tokenAddress = await erc20Mock.getAddress();

      const walletAddressMain = await ayaraController.wallets(aliceAddress);
      const walletAddressOptimism =
        await ayaraControllerOptimism.wallets(aliceAddress);

      // We expect to see that gas is used and some is available on Optimism before
      const gasDataOptiBefore = await ayaraControllerOptimism.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataOptiBefore.usedAmount).to.equal(100);
      // Should be a third of 1e18
      expect(gasDataOptiBefore.totalAmount).to.equal(amountAvailableBefore);
      log("Gas Data on Optimism chain before: ", gasDataOptiBefore);

      // We expect to see that gas is locked on Main before
      const gasDataMainBefore = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataMainBefore.lockedAmount).to.gt(0);
      log("Gas Data on Main chain before: ", gasDataMainBefore);

      // Initiate a settle operation
      const tx = ayaraControllerOptimism.initiateSettlement(
        aliceAddress,
        tokenAddress,
        config.ayaraInstances.sepolia.chainId,
        await ayaraController.getAddress(),
        0 // CCIP Gas Limit
      );

      await expect(tx)
        .to.emit(ayaraControllerOptimism, "WalletGasSettled")
        .withArgs(
          aliceAddress,
          tokenAddress,
          amountAvailableBefore - gasDataOptiBefore.usedAmount
        )
        .and.to.emit(ayaraController, "WalletGasUnlocked");

      // Check the finalized amount on Optimism
      const gasDataOptiAfter = await ayaraControllerOptimism.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      expect(gasDataOptiAfter.usedAmount).to.equal(0);
      expect(gasDataOptiAfter.totalAmount).to.equal(0);
      log("Gas Data on Optimism chain after: ", gasDataOptiAfter);

      // Check the unlocked amount on Main
      const gasDataMainAfter = await ayaraController.getUserGasData(
        aliceAddress,
        tokenAddress
      );
      log("Gas Data on Main chain after: ", gasDataMainAfter);
      expect(gasDataMainAfter.lockedAmount).to.lt(
        gasDataMainBefore.lockedAmount
      );
    });
  });
});
