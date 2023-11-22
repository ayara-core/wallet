import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { KeySignManager } from "../utils/keySignManager";
import { getSystemConfig } from "../utils/deployConfig";
import { createPack } from "../utils/testUtils";
import { deploySystem } from "../scripts/deploy";
import { ClaimData } from "../utils/erc20moduleData";
import { getCommonSigners } from "../utils/signers";

const systemConfig = getSystemConfig(hre);

describe("AyaraMain", function () {
  // This fixture deploys the contract and returns it
  const setup = async () => {
    // Get signers
    const { alice, bob, deployer, relayer } = await getCommonSigners(hre);

    // ERC6551 Related contracts
    const {} = await deploySystem(hre, deployer, systemConfig);

    // Set PackMain address in KeySignManager

    return { alice, bob, deployer, relayer };
  };

  it("Should be deployed", async function () {
    const {} = await loadFixture(setup);
  });
});
