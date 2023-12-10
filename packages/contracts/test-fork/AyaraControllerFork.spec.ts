import { expect } from "chai";
import hre, { ethers } from "hardhat";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { AddressLike, Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { getDeployConfig, getSystemConfig } from "../utils/deployConfig";
import { deploySystem } from "../scripts/deploy";
import { getCommonSigners } from "../utils/signers";
import { logger } from "../utils/deployUtils";
import { generateSignature } from "../utils/signature";

import { createWalletAndGetAddress } from "../test/test-utils";

import { AyaraController, ERC20Mock, ERC20 } from "../typechain-types";
import { ERC20__factory } from "../typechain-types/";

// Initialize logger for test logs
const log = logger("log", "test");

// Load system configuration
const systemConfig = getSystemConfig(hre);

interface TestContext {
  alice: Signer;
  bob: Signer;
  deployer: Signer;
  relayer: Signer;
  erc20Mock: ERC20Mock;
  ayaraController: AyaraController;
  hre: HardhatRuntimeEnvironment;
}

describe("AyaraController Fork tests", function () {
  // This fixture deploys the contract and returns it
  const setup = async () => {
    // Get signers
    const { alice, bob, deployer, relayer } = await getCommonSigners(hre);

    const {
      ayaraControllerPrimary: ayaraController,
      mocks: { erc20Mock } = {},
    } = await deploySystem(hre, deployer, { unitTest: false });
    if (!erc20Mock) {
      throw new Error("ERC20Mock not deployed");
    }
    return { alice, bob, deployer, relayer, ayaraController, erc20Mock, hre };
  };
  describe("AyaraController, Test deployment on different chains and check address", function () {
    let ayaraControllerAddressOptimism: AddressLike;
    let walletAddressOptimism: AddressLike;
    let ayaraControllerAddressBase: AddressLike;
    let walletAddressBase: AddressLike;

    const setupTestDeploy = async () => {
      const { deployer } = await getCommonSigners(hre);
      const config = getSystemConfig(hre);
      const deployConfig = getDeployConfig();
      return { deployer, config, deployConfig };
    };

    it("Should deploy AyaraController on chainId 420", async function () {
      // Get signers, using fixture
      const { deployer, config, deployConfig } =
        await loadFixture(setupTestDeploy);
      const nonce = await deployer.getNonce();
      log(`Nonce: ${nonce}`);

      // Deploy AyaraController
      const ayaraControllerFactory =
        await ethers.getContractFactory("AyaraController");
      const chainId = config.ayaraInstances.optimism.chainId;
      const ayaraController = await ayaraControllerFactory.deploy(
        await deployer.getAddress(),
        config.ayaraConfig.salt,
        chainId,
        [deployConfig.linkTokenAddress[chainId]],
        deployConfig.routerAddress[chainId],
        deployConfig.linkTokenAddress[chainId]
      );

      // Check if AyaraController is deployed
      expect(await ayaraController.getAddress()).to.be.properAddress;
      ayaraControllerAddressOptimism = await ayaraController.getAddress();
      log(`AyaraController: ${ayaraControllerAddressOptimism}`);

      // Precalculate the wallet address
      const walletAddress = await ayaraController.calculateWalletAddress(
        await deployer.getAddress()
      );
      log(`Wallet address should be: ${walletAddress}`);

      // Create a wallet for the deployer and check the address
      const tx = await ayaraController.createWallet(
        await deployer.getAddress(),
        []
      );
      const receipt = await tx.wait();
      walletAddressOptimism = await ayaraController.wallets(
        await deployer.getAddress()
      );
      log(`Wallet: ${walletAddressOptimism}`);
    });
    it("Should deploy AyaraController on chainId 84531", async function () {
      // Get signers
      const { deployer, config, deployConfig } =
        await loadFixture(setupTestDeploy);
      const nonce = await deployer.getNonce();
      log(`Nonce: ${nonce}`);

      // Deploy AyaraController
      const ayaraControllerFactory =
        await ethers.getContractFactory("AyaraController");
      const chainId = config.ayaraInstances.base.chainId;
      const ayaraController = await ayaraControllerFactory.deploy(
        await deployer.getAddress(),
        config.ayaraConfig.salt,
        chainId,
        [deployConfig.linkTokenAddress[chainId]],
        deployConfig.routerAddress[chainId],
        deployConfig.linkTokenAddress[chainId]
      );

      // Check if AyaraController is deployed
      expect(await ayaraController.getAddress()).to.be.properAddress;
      ayaraControllerAddressBase = await ayaraController.getAddress();
      log(`AyaraController: ${ayaraControllerAddressBase}`);

      // Precalculate the wallet address
      const walletAddress = await ayaraController.calculateWalletAddress(
        await deployer.getAddress()
      );
      log(`Wallet address should be: ${walletAddress}`);

      // Create a wallet for the deployer and check the address
      const tx = await ayaraController.createWallet(
        await deployer.getAddress(),
        []
      );
      const receipt = await tx.wait();
      walletAddressBase = await ayaraController.wallets(
        await deployer.getAddress()
      );
      log(`Wallet: ${walletAddressBase}`);
    });
    it("Should be the same address on both chains", async function () {
      expect(ayaraControllerAddressOptimism).to.equal(
        ayaraControllerAddressBase
      );
      expect(walletAddressOptimism).to.equal(walletAddressBase);
    });
  });
  describe("AyaraController, Initial Setup and Send Crosschain Message", function () {
    const deployConfig = getDeployConfig();
    const linkWhale = "0x4281eCF07378Ee595C564a59048801330f3084eE";
    let linkTokenAddress: string;
    let chainId: number;
    let linkToken: ERC20;

    before("Load fixtures", async function () {
      Object.assign(this, await loadFixture(setup));
    });

    it("Should deploy AyaraController and Set correct params", async function () {
      const { ayaraController, erc20Mock, deployer, hre } =
        this as any as TestContext;

      // Check if AyaraController is deployed
      expect(await ayaraController.getAddress()).to.be.properAddress;

      const ayaraControllerInstance = ayaraController.connect(deployer);

      chainId = Number(await ayaraControllerInstance.chainId());
      linkTokenAddress = deployConfig.linkTokenAddress[chainId];

      expect(await ayaraControllerInstance.owner()).to.equal(
        await deployer.getAddress()
      );
      expect(await ayaraControllerInstance.chainId()).to.equal(420);

      expect(await ayaraControllerInstance.router()).to.equal(
        deployConfig.routerAddress[chainId]
      );

      expect(await ayaraControllerInstance.link()).to.equal(linkTokenAddress);
    });
    it("Should whitelist link tokens to use for gas", async function () {
      const { ayaraController, deployer, erc20Mock } =
        this as any as TestContext;

      const ayaraControllerInstance = ayaraController.connect(deployer);

      // Check if it is whitelisted
      expect(await ayaraControllerInstance.isGasToken(linkTokenAddress)).to.be
        .true;
    });
    it("Should get some link tokens for alice", async function () {
      const { alice, ayaraController, erc20Mock, deployer, hre } =
        this as any as TestContext;

      const ayaraControllerInstance = ayaraController.connect(deployer);

      // Impersonate link whale and send some link tokens to alice
      const linkWhaleSigner = await hre.ethers.getImpersonatedSigner(linkWhale);
      linkToken = ERC20__factory.connect(linkTokenAddress, linkWhaleSigner);

      // Send 100 link tokens to alice
      await linkToken.transfer(
        await alice.getAddress(),
        ethers.parseEther("100")
      );

      // Check if alice has 100 link tokens
      expect(await linkToken.balanceOf(await alice.getAddress())).to.equal(
        ethers.parseEther("100")
      );
    });
    it("Should Stake Link fo Alice", async function () {
      const { alice, ayaraController, erc20Mock, deployer, hre } =
        this as any as TestContext;

      const ayaraControllerAlice = ayaraController.connect(alice);

      const aliceAddress = await alice.getAddress();

      const txApprove = await linkToken
        .connect(alice)
        .approve(
          await ayaraControllerAlice.getAddress(),
          ethers.parseEther("100")
        );
      await txApprove.wait();

      const tx = await ayaraControllerAlice.addFundsToWallet(
        aliceAddress,
        linkTokenAddress,
        ethers.parseEther("50")
      );
      await expect(tx)
        .to.emit(ayaraControllerAlice, "WalletCreated")
        .and.to.emit(ayaraControllerAlice, "WalletGasFunded")
        .withArgs(aliceAddress, linkTokenAddress, ethers.parseEther("50"));

      // Get Gas for Alice

      const gasData = await ayaraControllerAlice.getUserGasData(
        aliceAddress,
        linkTokenAddress
      );
      log(`Gas Data: ${gasData}`);
      expect(gasData.totalAmount).to.equal(ethers.parseEther("50"));
      expect(gasData.usedAmount).to.equal(0);
      expect(gasData.lockedAmount).to.equal(0);
    });
    it("Should execute this chain something", async function () {
      // We gonna try to send one link into the wallet and then we will send it back
      const { alice, ayaraController, erc20Mock, deployer } =
        this as any as TestContext;

      const ayaraControllerAlice = ayaraController.connect(alice);
      const ayaraControllerDeployer = ayaraController.connect(deployer);

      const aliceAddress = await alice.getAddress();
      const walletAddress = await ayaraControllerAlice.wallets(aliceAddress);

      // Send one link to the wallet
      const txTransfer = await linkToken
        .connect(alice)
        .transfer(walletAddress, ethers.parseEther("1"));
      await txTransfer.wait();

      // Check if the wallet has 1 link
      expect(await linkToken.balanceOf(walletAddress)).to.equal(
        ethers.parseEther("1")
      );

      const walletInstance = await ethers.getContractAt(
        "AyaraWalletInstance",
        walletAddress
      );

      const data = linkToken.interface.encodeFunctionData("transfer", [
        aliceAddress,
        ethers.parseEther("1"),
      ]);

      const signature = await generateSignature(
        hre,
        alice,
        walletInstance,
        data
      );

      const feeData = {
        tokenSource: linkTokenAddress,
        tokenDestination: linkTokenAddress,
        maxFee: ethers.parseEther("0.01"),
        relayerFee: ethers.parseEther("0.01"),
        ccipGasLimit: 0,
      };

      const transaction = {
        destinationChainId: chainId,
        to: linkTokenAddress,
        value: 0,
        data: data,
        signature: signature,
      };

      const tx = await ayaraControllerDeployer.executeUserOperation(
        aliceAddress,
        walletAddress,
        feeData,
        transaction
      );
      await expect(tx).to.emit(ayaraControllerDeployer, "OperationExecuted");

      // Check if the wallet has 0 link
      expect(await linkToken.balanceOf(walletAddress)).to.equal(0);

      // Gas data should be updated
      const gasData = await ayaraControllerAlice.getUserGasData(
        aliceAddress,
        linkTokenAddress
      );

      expect(gasData.totalAmount).to.equal(ethers.parseEther("50"));
      expect(gasData.usedAmount).to.equal(ethers.parseEther("0.01"));
      expect(gasData.lockedAmount).to.equal(0);
    });
    it("Should initiate a crosschain transfer", async function () {
      const { alice, ayaraController, erc20Mock, deployer } =
        this as any as TestContext;

      const ayaraControllerAlice = ayaraController.connect(alice);
      const ayaraControllerDeployer = ayaraController.connect(deployer);

      const aliceAddress = await alice.getAddress();
      const walletAddress = await ayaraControllerAlice.wallets(aliceAddress);

      const walletInstance = await ethers.getContractAt(
        "AyaraWalletInstance",
        walletAddress
      );

      // Data is not that important here since the message will never arrive in the fork
      const data = linkToken.interface.encodeFunctionData("transfer", [
        aliceAddress,
        ethers.parseEther("1"),
      ]);
      // Same for the signature
      const signature = await generateSignature(
        hre,
        alice,
        walletInstance,
        data
      );

      const feeData = {
        tokenSource: linkTokenAddress,
        tokenDestination: linkTokenAddress,
        maxFee: ethers.parseEther("1"),
        relayerFee: ethers.parseEther("0.01"),
        ccipGasLimit: 0,
      };

      const transaction = {
        destinationChainId: systemConfig.ayaraInstances.base.chainId,
        to: linkTokenAddress,
        value: 0,
        data: data,
        signature: signature,
      };

      const tx = await ayaraControllerDeployer.executeUserOperation(
        aliceAddress,
        walletAddress,
        feeData,
        transaction
      );
      await expect(tx)
        .to.emit(ayaraControllerAlice, "OperationExecutionSent")
        .and.to.emit(ayaraControllerAlice, "MessageSent");
    });
  });
});
