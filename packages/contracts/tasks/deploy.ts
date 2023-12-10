import { subtask, task, types } from "hardhat/config";
import { deploySystem } from "../scripts/deploy";
import { logger } from "../utils/deployUtils";
import { getDeployedAddress } from "../utils/saveAddress";
const log = logger("log", "task");

subtask("deploy", "Deploy the contracts (defaults to localhost)").setAction(
  async (args, hre) => {
    log("Subtask deploy");

    return await deploySystem(hre, await hre.ethers.provider.getSigner(), {
      unitTest: false,
      slowMode: true,
    });
  }
);

task("deploy").setAction(async (_, __, runSuper) => {
  return runSuper();
});

task(
  "deploy-dev-env",
  "Deploy all contracts, send ETH  and mint ERC20 to test accounts"
).setAction(async (args, hre) => {
  log("deploy-dev-env");
  await hre.run("deploy", args);
  // Setup 3  test accounts, dao, alice, bob
  await hre.run("fund:account", { account: process.env.ACCOUNT_1 });
});

task("fund:account", "Send ETH, ERC20Mocks, and NFTsMocks to an account")
  .addParam("account", "The account to fund", undefined, types.string)
  .setAction(async (args, hre) => {
    log("fund:account");
    const account = args.account;
    // const isLocal =
    //   hre.network.name === "hardhat" || hre.network.name === "localhost";
    await hre.run("send:eth", { account: account, amount: 1 });

    let erc20MockAddress = await getDeployedAddress(hre, "ERC20Mock");

    await hre.run("mint:erc20", {
      account: account,
      tokenaddress: erc20MockAddress,
      amount: 1000,
    });
  });
