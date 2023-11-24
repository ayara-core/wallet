import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { EventLog, Contract, Signer, Log } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { getSystemConfig } from "../utils/deployConfig";
import { deploySystem } from "../scripts/deploy";
import { getCommonSigners } from "../utils/signers";
import { logger } from "../utils/deployUtils";

import { createWalletAndGetAddress, formatSignData } from "./test-utils";

// Initialize logger for test logs
const log = logger("log", "test");

// Load system configuration
const systemConfig = getSystemConfig(hre);

describe("AyaraController", function () {
  const CHAIN_ID = 31337;
  // This fixture deploys the contract and returns it
  const setup = async () => {
    // Get signers
    const { alice, bob, deployer, relayer } = await getCommonSigners(hre);

    const {
      ayaraController,
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
      expect(await ayaraControllerInstance.salt()).to.equal(
        systemConfig.ayaraConfig.salt
      );
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

      const tx = await ayaraControllerInstance.updateGasTokens(
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

      const tx = ayaraControllerInstance.updateGasTokens(
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
      const tx2 = ayaraControllerInstance.fundWallet(
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
      const tx2 = await ayaraControllerInstanceDeployer.updateGasTokens(
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

      const tx4 = ayaraControllerInstance.fundWallet(
        await alice.getAddress(),
        await erc20Mock.getAddress(),
        ethers.parseEther("1000")
      );
      await expect(tx4)
        .to.emit(ayaraControllerInstance, "WalletGasFunded")
        .withArgs(
          await alice.getAddress(),
          walletAddress,
          await erc20Mock.getAddress(),
          ethers.parseEther("1000")
        );
      expect(
        await erc20Mock.balanceOf(await ayaraController.getAddress())
      ).to.equal(ethers.parseEther("1000"));
    });
  });

  describe.skip("AyaraWalletInstace: Wallet creation and addresses tests", async function () {
    let aliceWalletAddress: string;
    let bobWalletAddress: string;

    it("Should emit WalletCreated event", async function () {
      const { ayaraController, alice } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(alice);

      const aliceAddress = await alice.getAddress();
      await expect(
        ayaraControllerInstance.createWallet(aliceAddress, [])
      ).to.emit(ayaraControllerInstance, "WalletCreated");
    });
    it("Should have the right contract and interface for the Wallet", async function () {
      const { ayaraController, alice } = await loadFixture(setup);

      const aliceAddress = await alice.getAddress();
      const { walletAddress, walletInstance } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      log(`walletAddress: ${walletAddress}`);

      // Check the storage properties
      expect(await walletInstance.VERSION()).to.equal(1);
      expect(await walletInstance.ownerAddress()).to.equal(aliceAddress);
      expect(await walletInstance.controllerAddress()).to.equal(
        await ayaraController.getAddress()
      );
      expect(await walletInstance.nonce()).to.equal(0);
      expect(await walletInstance.chainId()).to.equal(CHAIN_ID);
    });
    it("Should create a new Wallet for Alice", async function () {
      const { ayaraController, alice } = await loadFixture(setup);

      const aliceAddress = await alice.getAddress();
      log(`aliceAddress: ${aliceAddress}`);

      const { walletAddress, walletInstance } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      aliceWalletAddress = walletAddress;

      log(`aliceWalletAddress: ${aliceWalletAddress}`);

      expect(aliceWalletAddress).to.not.equal(ethers.ZeroAddress);
      expect(aliceWalletAddress).to.be.properAddress;
      expect(aliceWalletAddress).to.not.equal(aliceAddress);
    });
    it("Should create a new Wallet for Bob", async function () {
      const { ayaraController, bob } = await loadFixture(setup);

      const bobAddress = await bob.getAddress();
      log(`bobAddress: ${bobAddress}`);

      const { walletAddress, walletInstance } = await createWalletAndGetAddress(
        ayaraController,
        bob
      );

      bobWalletAddress = walletAddress;

      log(`bobWalletAddress: ${bobWalletAddress}`);

      expect(bobWalletAddress).to.not.equal(ethers.ZeroAddress);
      expect(bobWalletAddress).to.be.properAddress;
      expect(bobWalletAddress).to.not.equal(bobAddress);
    });
    it("Should not create a new Wallet for Alice if she already has one", async function () {
      const { ayaraController, alice } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(alice);

      const aliceAddress = await alice.getAddress();
      log(`aliceAddress: ${aliceAddress}`);

      const { walletAddress, walletInstance } = await createWalletAndGetAddress(
        ayaraController,
        alice
      );

      log(`walletAddress: ${walletAddress}`);

      expect(walletAddress).to.not.equal(ethers.ZeroAddress);
      expect(walletAddress).to.be.properAddress;
      expect(walletAddress).to.not.equal(aliceAddress);

      // Try to create a new wallet for Alice
      const tx = ayaraControllerInstance.createWallet(aliceAddress, []);
      await expect(tx).to.revertedWithCustomError(
        ayaraControllerInstance,
        "WalletAlreadyInitialized"
      );
    });
    it("Should have different Wallet addresses for Alice and Bob", async function () {
      expect(aliceWalletAddress).to.not.equal(bobWalletAddress);
    });
    it("Should have the same address for Alice and Bob regardless of order", async function () {
      // This time create Bob's wallet first
      const { ayaraController, alice, bob } = await loadFixture(setup);

      const { walletAddress: bobWalletAddressSecond } =
        await createWalletAndGetAddress(ayaraController, bob);

      log(`bobWalletAddressSecond: ${bobWalletAddressSecond}`);
      expect(bobWalletAddressSecond).to.equal(bobWalletAddress);

      // Now create Alice's wallet
      const { walletAddress: aliceWalletAddressSecond } =
        await createWalletAndGetAddress(ayaraController, alice);

      log(`aliceWalletAddressSecond: ${aliceWalletAddressSecond}`);
      expect(aliceWalletAddressSecond).to.equal(aliceWalletAddress);
    });
  });
  describe.skip("AyaraWalletInstace: Send transactions, self-funded", async function () {
    it("Should send ETH", async function () {
      const { ayaraController, alice, bob } = await loadFixture(setup);

      const { walletAddress: aliceWalletAddress } =
        await createWalletAndGetAddress(ayaraController, alice);

      // Check that the wallet is empty
      const balanceWalletEmpty =
        await ethers.provider.getBalance(aliceWalletAddress);
      expect(balanceWalletEmpty).to.equal(0);
      log(`aliceWallet Empty Balance: ${balanceWalletEmpty}`);

      // Transfer 1 ETH into the wallet
      const tx2 = await alice.sendTransaction({
        to: aliceWalletAddress,
        value: ethers.parseEther("1"),
      });

      // Wait for the transaction to be mined
      await tx2.wait();

      // Check the balance of the wallet
      const balanceWalletBefore =
        await ethers.provider.getBalance(aliceWalletAddress);
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      // Try to send 0.5 ETH to Bob
      const bobAddress = await bob.getAddress();
      const bobBalanceBefore = await ethers.provider.getBalance(bobAddress);
      log(`bobBalanceBefore: ${bobBalanceBefore}`);
      const ayaraWalletInstanceAlice = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(alice);

      const tx3 = await ayaraWalletInstanceAlice.execute(
        bobAddress,
        ethers.parseEther("0.5"),
        "0x",
        "0x"
      );
      await tx3.wait();

      // Check the balance of the wallet
      const balanceWalletAfter =
        await ethers.provider.getBalance(aliceWalletAddress);
      expect(balanceWalletAfter).to.equal(ethers.parseEther("0.5"));
      log(`balanceWalletAfter: ${balanceWalletAfter}`);

      // Check the balance of Bob
      const bobBalanceAfter = await ethers.provider.getBalance(bobAddress);
      expect(bobBalanceAfter).to.equal(
        bobBalanceBefore + ethers.parseEther("0.5")
      );
      log(`bobBalanceAfter: ${bobBalanceAfter}`);
    });
    it("Should send ERC20, interaction with Smart Contract", async function () {
      const { ayaraController, alice, bob, erc20Mock } =
        await loadFixture(setup);

      const { walletAddress: aliceWalletAddress } =
        await createWalletAndGetAddress(ayaraController, alice);

      // Check that the wallet is empty
      const balanceWalletEmpty = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletEmpty).to.equal(0);
      log(`aliceWallet Empty Balance: ${balanceWalletEmpty}`);

      // Mint 1000 ERC20 into the wallet
      const tx2 = await erc20Mock.mint(
        aliceWalletAddress,
        ethers.parseEther("1000")
      );
      await tx2.wait();
      const balanceWalletBefore = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1000"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      // Try to send 1000 ERC20 to Bob
      const bobAddress = await bob.getAddress();
      const bobBalanceBefore = await erc20Mock.balanceOf(bobAddress);
      expect(bobBalanceBefore).to.equal(0);
      log(`bobBalanceBefore: ${bobBalanceBefore}`);
      const ayaraWalletInstanceAlice = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(alice);

      const data = erc20Mock.interface.encodeFunctionData("transfer", [
        bobAddress,
        ethers.parseEther("1000"),
      ]);

      const tx3 = await ayaraWalletInstanceAlice.execute(
        await erc20Mock.getAddress(),
        0,
        data, // Data for transfer
        "0x" // No Singature since it's self executed
      );
      await tx3.wait();

      // Check the balance of the wallet
      const balanceWalletAfter = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletAfter).to.equal(0);
      log(`balanceWalletAfter: ${balanceWalletAfter}`);

      // Check the balance of Bob
      const bobBalanceAfter = await erc20Mock.balanceOf(bobAddress);
      expect(bobBalanceAfter).to.equal(ethers.parseEther("1000"));
      log(`bobBalanceAfter: ${bobBalanceAfter}`);
    });
  });
  describe.skip("ERC20 transactions via Relayer with valid signature", function () {
    it("Should send ERC20", async function () {
      const { ayaraController, alice, bob, erc20Mock, relayer } =
        await loadFixture(setup);

      const { walletAddress: aliceWalletAddress } =
        await createWalletAndGetAddress(ayaraController, alice);

      // Check that the wallet is empty
      const balanceWalletEmpty = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletEmpty).to.equal(0);
      log(`aliceWallet Empty Balance: ${balanceWalletEmpty}`);

      // Mint 1000 ERC20 into the wallet
      const tx2 = await erc20Mock.mint(
        aliceWalletAddress,
        ethers.parseEther("1000")
      );
      await tx2.wait();
      const balanceWalletBefore = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1000"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      const ayaraWalletInstanceAlice = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(alice);

      // Get data and nonce for the transaction
      const data = erc20Mock.interface.encodeFunctionData("transfer", [
        await bob.getAddress(),
        ethers.parseEther("1000"),
      ]);

      const message = await formatSignData(ayaraWalletInstanceAlice, data);
      const signature = await alice.signMessage(ethers.getBytes(message));

      const ayaraWalletInstanceRelayer = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(relayer);

      const tx3 = await ayaraWalletInstanceRelayer.execute(
        await erc20Mock.getAddress(),
        0,
        data, // Data for transfer
        signature
      );
      await tx3.wait();
    });
    it("Should not send ERC20 if the signature is invalid", async function () {
      const { ayaraController, alice, bob, erc20Mock, relayer } =
        await loadFixture(setup);

      const { walletAddress: aliceWalletAddress } =
        await createWalletAndGetAddress(ayaraController, alice);

      // Check that the wallet is empty
      const balanceWalletEmpty = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletEmpty).to.equal(0);
      log(`aliceWallet Empty Balance: ${balanceWalletEmpty}`);

      // Mint 1000 ERC20 into the wallet
      const tx = await erc20Mock.mint(
        aliceWalletAddress,
        ethers.parseEther("1000")
      );
      await tx.wait();
      const balanceWalletBefore = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1000"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      const ayaraWalletInstanceAlice = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(alice);

      // Get data and nonce for the transaction
      const data = erc20Mock.interface.encodeFunctionData("transfer", [
        await bob.getAddress(),
        ethers.parseEther("1000"),
      ]);

      const message = await formatSignData(ayaraWalletInstanceAlice, data);
      const signature = await relayer.signMessage(ethers.getBytes(message));

      const ayaraWalletInstanceRelayer = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(relayer);

      const tx2 = ayaraWalletInstanceRelayer.execute(
        await erc20Mock.getAddress(),
        0,
        data, // Data for transfer
        signature
      );
      await expect(tx2).to.revertedWithCustomError(
        ayaraWalletInstanceRelayer,
        "InvalidSignature"
      );
    });
    it("Should not send ERC20 if the nonce is invalid, too high", async function () {
      const { ayaraController, alice, bob, erc20Mock, relayer } =
        await loadFixture(setup);

      const { walletAddress: aliceWalletAddress } =
        await createWalletAndGetAddress(ayaraController, alice);

      // Check that the wallet is empty
      const balanceWalletEmpty = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletEmpty).to.equal(0);
      log(`aliceWallet Empty Balance: ${balanceWalletEmpty}`);

      // Mint 1000 ERC20 into the wallet
      const tx = await erc20Mock.mint(
        aliceWalletAddress,
        ethers.parseEther("1000")
      );
      await tx.wait();
      const balanceWalletBefore = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1000"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      const ayaraWalletInstanceAlice = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(alice);

      // Get data and nonce for the transaction
      const data = erc20Mock.interface.encodeFunctionData("transfer", [
        await bob.getAddress(),
        ethers.parseEther("1000"),
      ]);

      const nonce = await ayaraWalletInstanceAlice.nonce();

      const message = ethers.solidityPacked(
        ["address", "address", "uint256", "uint256", "bytes"],
        [
          await ayaraWalletInstanceAlice.ownerAddress(),
          await ayaraWalletInstanceAlice.controllerAddress(),
          CHAIN_ID,
          nonce + 1n,
          data,
        ]
      );
      const signature = await alice.signMessage(ethers.getBytes(message));

      const ayaraWalletInstanceRelayer = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(relayer);

      const tx2 = ayaraWalletInstanceRelayer.execute(
        await erc20Mock.getAddress(),
        0,
        data, // Data for transfer
        signature
      );
      await expect(tx2).to.revertedWithCustomError(
        ayaraWalletInstanceRelayer,
        "InvalidSignature"
      );
    });
    it("Should not send ERC20 if the nonce is invalid, too low", async function () {
      const { ayaraController, alice, bob, erc20Mock, relayer } =
        await loadFixture(setup);

      const { walletAddress: aliceWalletAddress } =
        await createWalletAndGetAddress(ayaraController, alice);

      // Check that the wallet is empty
      const balanceWalletEmpty = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletEmpty).to.equal(0);
      log(`aliceWallet Empty Balance: ${balanceWalletEmpty}`);

      // Mint 1000 ERC20 into the wallet
      const tx = await erc20Mock.mint(
        aliceWalletAddress,
        ethers.parseEther("1000")
      );
      await tx.wait();
      const balanceWalletBefore = await erc20Mock.balanceOf(aliceWalletAddress);
      expect(balanceWalletBefore).to.equal(ethers.parseEther("1000"));
      log(`balanceWallet: ${balanceWalletBefore}`);

      const ayaraWalletInstanceAlice = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(alice);

      // Get data and nonce for the transaction
      const data = erc20Mock.interface.encodeFunctionData("transfer", [
        await bob.getAddress(),
        ethers.parseEther("500"),
      ]);

      const nonce = await ayaraWalletInstanceAlice.nonce();

      const message = await formatSignData(ayaraWalletInstanceAlice, data);
      const signature = await alice.signMessage(ethers.getBytes(message));

      const ayaraWalletInstanceRelayer = (
        await ethers.getContractAt("AyaraWalletInstance", aliceWalletAddress)
      ).connect(relayer);

      const tx2 = await ayaraWalletInstanceRelayer.execute(
        await erc20Mock.getAddress(),
        0,
        data, // Data for transfer
        signature
      );
      await tx2.wait();

      // confirm that the nonce has been incremented
      const nonceAfter = await ayaraWalletInstanceAlice.nonce();
      expect(nonceAfter).to.equal(nonce + 1n);

      // Try again to send with the same nonce
      const tx3 = ayaraWalletInstanceRelayer.execute(
        await erc20Mock.getAddress(),
        0,
        data, // Data for transfer
        signature
      );

      await expect(tx3).to.revertedWithCustomError(
        ayaraWalletInstanceRelayer,
        "InvalidSignature"
      );
    });
  });
});
