import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { getSystemConfig } from "../utils/deployConfig";
import { deploySystem } from "../scripts/deploy";
import { getCommonSigners } from "../utils/signers";
import { logger } from "../utils/deployUtils";
import { generateSignature } from "../utils/signature";

import { createWalletAndGetAddress } from "./test-utils";

// Initialize logger for test logs
const log = logger("log", "test");

// Load system configuration
const systemConfig = getSystemConfig(hre);

describe("AyaraController", function () {
  const CHAIN_ID = 11155111;
  // This fixture deploys the contract and returns it
  const setup = async () => {
    // Get signers
    const { alice, bob, deployer, relayer } = await getCommonSigners(hre);

    const {
      ayaraControllerPrimary: ayaraController,
      mocks: { erc20Mock },
    } = await deploySystem(hre, deployer, systemConfig);
    return { alice, bob, deployer, relayer, ayaraController, erc20Mock };
  };
  describe("AyaraController: Deployment tests", async function () {
    it("Should successfully deploy AyaraController", async function () {
      const { ayaraController, deployer } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(deployer);

      expect(await ayaraControllerInstance.getAddress()).to.not.equal(
        ethers.ZeroAddress
      );
      expect(await ayaraControllerInstance.getAddress()).to.be.properAddress;

      expect(await ayaraControllerInstance.VERSION()).to.equal(1);
      expect(await ayaraControllerInstance.chainId()).to.equal(CHAIN_ID);

      const adminAddress = await ayaraControllerInstance.owner();
      log(`adminAddress: ${adminAddress}`);
      const deployerAddress = await deployer.getAddress();
      expect(adminAddress).to.equal(deployerAddress);
    });
    it("Should whitelist gasToken via admin function", async function () {
      const { ayaraController, deployer } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(deployer);

      const isGasToken = await ayaraControllerInstance.isGasToken(
        ethers.ZeroAddress
      );
      expect(isGasToken).to.equal(false);

      const tx = await ayaraControllerInstance.modifyGasTokens(
        [ethers.ZeroAddress],
        true
      );
      await tx.wait();

      const isGasTokenAfter = await ayaraControllerInstance.isGasToken(
        ethers.ZeroAddress
      );
      expect(isGasTokenAfter).to.equal(true);
    });
    it("Should not whitelist gasToken via non-admin signer", async function () {
      const { ayaraController, alice } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(alice);

      const tx = ayaraControllerInstance.modifyGasTokens(
        [ethers.ZeroAddress],
        true
      );
      await expect(tx).to.revertedWithCustomError(
        ayaraControllerInstance,
        "OwnableUnauthorizedAccount"
      );
    });
  });
  describe("AyaraController: Wallet creation and funding", async function () {
    it("Should not allow to fund with non-whitelisted gasToken", async function () {
      const { ayaraController, alice, erc20Mock } = await loadFixture(setup);

      const { walletAddress } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      log(`walletAddress: ${walletAddress}`);
      expect(walletAddress).to.not.equal(ethers.ZeroAddress);

      // Mint 1000 ERC20 into the wallet
      const tx = await erc20Mock.mint(
        await alice.getAddress(),
        ethers.parseEther("1000")
      );
      await tx.wait();
      const balanceWalletBefore = await erc20Mock.balanceOf(
        await alice.getAddress()
      );
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1000"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      // Try to fund the wallet with non-whitelisted gasToken
      const ayaraControllerInstance = ayaraController.connect(alice);
      const tx2 = ayaraControllerInstance.addFundsToWallet(
        await alice.getAddress(),
        await erc20Mock.getAddress(),
        ethers.parseEther("1000")
      );
      expect(tx2).to.revertedWithCustomError(
        ayaraControllerInstance,
        "NotApprovedGasToken"
      );
    });
    it("Should create a new Wallet for Alice and fund with MockTokens", async function () {
      const { ayaraController, alice, erc20Mock, deployer } =
        await loadFixture(setup);

      const { walletAddress } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      log(`walletAddress: ${walletAddress}`);
      expect(walletAddress).to.not.equal(ethers.ZeroAddress);

      // Mint 1000 ERC20
      const tx = await erc20Mock.mint(
        await alice.getAddress(),
        ethers.parseEther("1000")
      );
      await tx.wait();

      // Whitelist the ERC20
      const ayaraControllerInstanceDeployer = ayaraController.connect(deployer);
      const tx2 = await ayaraControllerInstanceDeployer.modifyGasTokens(
        [await erc20Mock.getAddress()],
        true
      );
      await tx2.wait();
      expect(
        await ayaraControllerInstanceDeployer.isGasToken(
          await erc20Mock.getAddress()
        )
      ).to.equal(true);

      // Set allowance
      const tx3 = await erc20Mock
        .connect(alice)
        .approve(await ayaraController.getAddress(), ethers.parseEther("1000"));
      await tx3.wait();

      // Fund the wallet
      const ayaraControllerInstance = ayaraController.connect(alice);

      const tx4 = ayaraControllerInstance.addFundsToWallet(
        await alice.getAddress(),
        await erc20Mock.getAddress(),
        ethers.parseEther("1000")
      );
      await expect(tx4)
        .to.emit(ayaraControllerInstance, "WalletGasFunded")
        .withArgs(
          await alice.getAddress(),
          await erc20Mock.getAddress(),
          ethers.parseEther("1000")
        );
      expect(
        await erc20Mock.balanceOf(await ayaraController.getAddress())
      ).to.equal(ethers.parseEther("1000"));

      // Call function to check the balance of the wallet
      const userGasData = await ayaraControllerInstance.getUserGasData(
        await alice.getAddress(),
        await erc20Mock.getAddress()
      );

      expect(userGasData.totalAmount).to.equal(ethers.parseEther("1000"));
      expect(userGasData.usedAmount).to.equal(0);
      expect(userGasData.lockedAmount).to.equal(0);
    });
    it("Should create a new Wallet for Alice and fund with ETH", async function () {
      const { ayaraController, alice, deployer } = await loadFixture(setup);

      const { walletAddress } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      log(`walletAddress: ${walletAddress}`);

      // Whitelist ETH
      const ayaraControllerInstanceDeployer = ayaraController.connect(deployer);
      const tx = ayaraControllerInstanceDeployer.modifyGasTokens(
        [ethers.ZeroAddress],
        true
      );
      expect(tx)
        .to.emit(ayaraControllerInstanceDeployer, "GasTokensModified")
        .withArgs([ethers.ZeroAddress], [true]);

      // Fund the wallet
      const ayaraControllerInstance = ayaraController.connect(alice);

      const tx2 = ayaraControllerInstance.addFundsToWallet(
        await alice.getAddress(),
        ethers.ZeroAddress,
        ethers.parseEther("1")
      );
      await expect(tx2)
        .to.emit(ayaraControllerInstance, "WalletGasFunded")
        .withArgs(
          await alice.getAddress(),
          ethers.ZeroAddress,
          ethers.parseEther("1")
        );

      // Call function to check the balance of the wallet
      const userGasData = await ayaraControllerInstance.getUserGasData(
        await alice.getAddress(),
        ethers.ZeroAddress
      );

      expect(userGasData.totalAmount).to.equal(ethers.parseEther("1"));
      expect(userGasData.usedAmount).to.equal(0);
      expect(userGasData.lockedAmount).to.equal(0);
    });
  });
  describe("AyaraController: Sending txs and updating gas usage", async function () {
    const setupAndPrepare = async () => {
      const { ayaraController, alice, erc20Mock, deployer, bob } = {
        ...(await setup()),
      };

      const { walletAddress, walletInstance } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      // Mint 1000 ERC20
      const tx1 = await erc20Mock.mint(
        await alice.getAddress(),
        ethers.parseEther("1000")
      );
      await tx1.wait();

      // Send 500 ERC20 into the wallet
      const tx2 = await erc20Mock
        .connect(alice)
        .transfer(walletAddress, ethers.parseEther("500"));
      await tx2.wait();

      // Whitelist the ERC20
      const ayaraControllerInstanceDeployer = ayaraController.connect(deployer);
      const tx3 = await ayaraControllerInstanceDeployer.modifyGasTokens(
        [await erc20Mock.getAddress()],
        true
      );
      await tx3.wait();

      // Set allowance
      const tx4 = await erc20Mock
        .connect(alice)
        .approve(await ayaraController.getAddress(), ethers.parseEther("500"));
      await tx4.wait();

      // Fund the wallet
      const ayaraControllerInstance = ayaraController.connect(alice);
      const tx5 = await ayaraControllerInstance.addFundsToWallet(
        await alice.getAddress(),
        await erc20Mock.getAddress(),
        ethers.parseEther("500")
      );
      await tx5.wait();

      // Call function to check the balance of the wallet
      const userGasData = await ayaraControllerInstance.getUserGasData(
        await alice.getAddress(),
        await erc20Mock.getAddress()
      );

      // Test userGasData
      expect(userGasData.totalAmount).to.equal(ethers.parseEther("500"));
      expect(userGasData.lockedAmount).to.equal(0);
      expect(userGasData.usedAmount).to.equal(0);

      return {
        ayaraController,
        alice,
        erc20Mock,
        deployer,
        walletAddress,
        walletInstance,
        bob,
      };
    };

    it("Should send a tx and update gas usage", async function () {
      const {
        ayaraController,
        alice,
        bob,
        erc20Mock,
        deployer,
        walletInstance,
      } = await loadFixture(setupAndPrepare);

      // Prepare tx, send ERC20 to Bob
      const data = erc20Mock.interface.encodeFunctionData("transfer", [
        await bob.getAddress(),
        ethers.parseEther("100"),
      ]);

      const signature = await generateSignature(alice, walletInstance, data);

      // Send a tx via the wallet, which should update the gas usage
      const ayaraControllerInstanceRelayer = ayaraController.connect(deployer);

      const feeData = {
        token: await erc20Mock.getAddress(),
        amount: ethers.parseEther("1"),
      };

      const transaction = {
        destinationChainId: CHAIN_ID,
        to: await erc20Mock.getAddress(),
        value: 0,
        data: data,
        signature: signature,
      };

      const tx = ayaraControllerInstanceRelayer.executeUserOperation(
        await alice.getAddress(),
        await walletInstance.getAddress(),
        feeData,
        transaction
      );
      await expect(tx)
        .to.emit(ayaraControllerInstanceRelayer, "OperationExecuted")
        .withArgs(
          await alice.getAddress(),
          await walletInstance.getAddress(),
          await erc20Mock.getAddress(),
          0,
          data,
          signature
        )
        .and.to.emit(ayaraControllerInstanceRelayer, "WalletGasCharged")
        .withArgs(
          await alice.getAddress(),
          await erc20Mock.getAddress(),
          ethers.parseEther("1")
        );

      // Check the GasData
      const userGasData = await ayaraControllerInstanceRelayer.getUserGasData(
        await alice.getAddress(),
        await erc20Mock.getAddress()
      );
      expect(userGasData.totalAmount).to.equal(ethers.parseEther("500"));
      expect(userGasData.lockedAmount).to.equal(0);
      expect(userGasData.usedAmount).to.equal(ethers.parseEther("1"));

      // Check that the transfer was successful
      const balanceBob = await erc20Mock.balanceOf(await bob.getAddress());
      expect(balanceBob).to.equal(ethers.parseEther("100"));
    });
  });
});
