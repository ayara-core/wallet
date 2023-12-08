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

task(
  "set:ayaraController",
  "Set the ayara controller address for a given chainId"
)
  .addParam(
    "chainid",
    "The chainId at which the ayara controller is deployed",
    undefined,
    types.int
  )
  .setAction(async (args, hre) => {
    log("set:ayara-controller");
    const chainIds = [420, 84531, 11155111];
    // Check that the supplied chainId is valid
    if (!chainIds.includes(args.chainid)) {
      throw new Error(
        `Invalid chainId supplied. Please supply one of ${chainIds}`
      );
    }

    log(`Setting ayara controller for chainId ${args.chainid}`);

    // Filter out the chainId that is being set
    const chainIdsToSet = chainIds.filter((id) => id !== args.chainid);
    log(`ChainIds to set: ${chainIdsToSet}`);

    // Get the ayara controller addresses
    const ayaraControllerAddresses = [];
    for (const chainId of chainIdsToSet) {
      ayaraControllerAddresses.push({
        address: await getDeployedAddress(hre, "AyaraController", {
          chainId: chainId,
        }),
        chainId: chainId,
      });
    }

    // Get the ayara controller address for the chainId being set
    const ayaraControllerAddress = await getDeployedAddress(
      hre,
      "AyaraController",
      {
        chainId: args.chainid,
      }
    );

    // Get the ayara controller instance
    const ayaraController = await hre.ethers.getContractAt(
      "AyaraController",
      ayaraControllerAddress,
      await hre.ethers.provider.getSigner()
    );

    // Set the ayara controller addresses
    for (const ayaraControllerAddress of ayaraControllerAddresses) {
      log(
        `Setting ayara controller address ${ayaraControllerAddress.address} for chainId ${ayaraControllerAddress.chainId}`
      );
      await ayaraController.setChainIdToAyaraController(
        ayaraControllerAddress.chainId,
        ayaraControllerAddress.address
      );
    }

    log("Done");
  });
