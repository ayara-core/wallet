import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { EventLog } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { getSystemConfig } from "../utils/deployConfig";
import { deploySystem } from "../scripts/deploy";
import { getCommonSigners } from "../utils/signers";
import { logger } from "../utils/deployUtils";

const log = logger("log", "test");

const systemConfig = getSystemConfig(hre);

describe("AyaraMain", function () {
  // This fixture deploys the contract and returns it
  const setup = async () => {
    // Get signers
    const { alice, bob, deployer, relayer } = await getCommonSigners(hre);

    const { ayaraController } = await deploySystem(hre, deployer, systemConfig);

    return { alice, bob, deployer, relayer, ayaraController };
  };

  it("Should be deployed", async function () {
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

    const adminAddress = await ayaraControllerInstance.owner();
    log(`adminAddress: ${adminAddress}`);
    const deployerAddress = await deployer.getAddress();
    expect(adminAddress).to.equal(deployerAddress);
  });
  describe("AyaraWalletInstace", async function () {
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
    it("Should create a new Wallet for Alice", async function () {
      const { ayaraController, alice } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(alice);

      const aliceAddress = await alice.getAddress();
      log(`aliceAddress: ${aliceAddress}`);

      const tx = await ayaraControllerInstance.createWallet(aliceAddress, []);
      const receipt = await tx.wait();

      const walletCreatedEvent = receipt?.logs?.find((e) => {
        return e.topics[0] === ethers.id("WalletCreated(address,address)");
      }) as EventLog;
      if (walletCreatedEvent) {
        aliceWalletAddress = walletCreatedEvent.args[1];
      }

      log(`aliceWalletAddress: ${aliceWalletAddress}`);

      expect(aliceWalletAddress).to.not.equal(ethers.ZeroAddress);
      expect(aliceWalletAddress).to.be.properAddress;
      expect(aliceWalletAddress).to.not.equal(aliceAddress);
    });
    it("Should create a new Wallet for Bob", async function () {
      const { ayaraController, bob } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(bob);

      const bobAddress = await bob.getAddress();
      log(`bobAddress: ${bobAddress}`);

      const tx = await ayaraControllerInstance.createWallet(bobAddress, []);
      const receipt = await tx.wait();

      const walletCreatedEvent = receipt?.logs?.find((e) => {
        return e.topics[0] === ethers.id("WalletCreated(address,address)");
      }) as EventLog;
      if (walletCreatedEvent) {
        bobWalletAddress = walletCreatedEvent.args[1];
      }

      log(`bobWalletAddress: ${bobWalletAddress}`);

      expect(bobWalletAddress).to.not.equal(ethers.ZeroAddress);
      expect(bobWalletAddress).to.be.properAddress;
      expect(bobWalletAddress).to.not.equal(bobAddress);
    });
    it("Should have different Wallet addresses for Alice and Bob", async function () {
      expect(aliceWalletAddress).to.not.equal(bobWalletAddress);
    });
    it("Should have the same address for Alice and Bob regardless of order", async function () {
      // This time create Bob's wallet first
      const { ayaraController, alice, bob } = await loadFixture(setup);
      const ayaraControllerInstance = ayaraController.connect(bob);

      const bobAddress = await bob.getAddress();
      const tx = await ayaraControllerInstance.createWallet(bobAddress, []);
      const receipt = await tx.wait();

      const walletCreatedEvent = receipt?.logs?.find((e) => {
        return e.topics[0] === ethers.id("WalletCreated(address,address)");
      }) as EventLog;

      let bobWalletAddressSecond: string = "";
      if (walletCreatedEvent) {
        bobWalletAddressSecond = walletCreatedEvent.args[1];
      }

      log(`bobWalletAddressSecond: ${bobWalletAddressSecond}`);
      expect(bobWalletAddressSecond).to.equal(bobWalletAddress);

      // Now create Alice's wallet
      const aliceAddress = await alice.getAddress();
      const tx2 = await ayaraControllerInstance.createWallet(aliceAddress, []);
      const receipt2 = await tx2.wait();

      const walletCreatedEvent2 = receipt2?.logs?.find((e) => {
        return e.topics[0] === ethers.id("WalletCreated(address,address)");
      }) as EventLog;

      let aliceWalletAddressSecond: string = "";
      if (walletCreatedEvent2) {
        aliceWalletAddressSecond = walletCreatedEvent2.args[1];
      }

      log(`aliceWalletAddressSecond: ${aliceWalletAddressSecond}`);
      expect(aliceWalletAddressSecond).to.equal(aliceWalletAddress);
    });
  });
});
