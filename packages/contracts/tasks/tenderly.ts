import { subtask, task, types } from "hardhat/config";
import { generateSignature } from "../utils/signature";

import { logger } from "../utils/deployUtils";
import { getDeployedAddress } from "../utils/saveAddress";
const log = logger("log", "task");

task("verify:tenderly", "Verify contracts on Tenderly").setAction(
  async (args, hre) => {
    log("verify:tenderly");

    const deployer = await hre.ethers.provider.getSigner();
    const address = await getDeployedAddress(hre, "AyaraController");

    const contract = await hre.ethers.getContractAt(
      "AyaraController",
      address,
      deployer
    );
    log(`AyaraController: ${address}`);
    log(`Network: ${hre.network.name}`);

    await hre.tenderly.verify({
      address,
      name: "AyaraController",
    });

    log(`Done`);
  }
);
