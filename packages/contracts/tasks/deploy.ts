import { subtask, task, types } from "hardhat/config";
import { deploySystem } from "../scripts/deploy";
import { getSystemConfig } from "../utils/deployConfig";
import { logger } from "../utils/deployUtils";
import { getDeployedAddress } from "../utils/saveAddress";
const info = logger("info", "task");

subtask(
  "deploy",
  "Deploy the contracts to the selected chain (defaults to localhost)"
).setAction(async (args, hre) => {
  info("Subtask deploy");
  const systemConfig = getSystemConfig(hre);
  return await deploySystem(
    hre,
    await hre.ethers.provider.getSigner(),
    systemConfig
  );
});

task("deploy").setAction(async (_, __, runSuper) => {
  return runSuper();
});

task(
  "deploy-dev-env",
  "Deploy all contracts, send ETH  and mint ERC20 to test accounts"
).setAction(async (args, hre) => {
  info("deploy-dev-env");
  await hre.run("deploy", args);
  // Setup 3  test accounts, dao, alice, bob
  await hre.run("fund:account", { account: process.env.ACCOUNT_1 });
});

task("fund:account", "Send ETH, ERC20Mocks, and NFTsMocks to an account")
  .addParam("account", "The account to fund", undefined, types.string)
  .setAction(async (args, hre) => {
    info("fund:account");
    const account = args.account;
    const isLocal =
      hre.network.name === "hardhat" || hre.network.name === "localhost";

    let addresses = {
      erc20MockA: isLocal
        ? "0x7D0B2154C5c709b3Cc8489286e023Cf75a38E0B5"
        : await getDeployedAddress(hre, "ERC20MockA"),
      erc20MockB: isLocal
        ? "0x416D29fbCf9fc5CA66d792B1f6368221E985ec47"
        : await getDeployedAddress(hre, "ERC20MockB"),
      erc721MockA: isLocal
        ? "0x0106f5483Ace34618dCC1c76EFF7e284e5dE4C6B"
        : await getDeployedAddress(hre, "ERC721MockA"),
      erc721MockB: isLocal
        ? "0x958B411CB2cf43678ca9d366a8a6469CEa85B8fE"
        : await getDeployedAddress(hre, "ERC721MockB"),
    };

    let tokenId = 0;
    for (let i = 1; i <= 3; i++) {
      if (account && account.length === 42) {
        await hre.run("send:eth", { account: account, amount: 1 });
        await hre.run("mint:erc20", {
          account: account,
          tokenaddress: addresses.erc20MockA,
          amount: 1000,
        });
        await hre.run("mint:erc20", {
          account: account,
          tokenaddress: addresses.erc20MockB,
          amount: 1000,
        });

        await hre.run("mint:erc721", {
          account: account,
          tokenaddress: addresses.erc721MockA,
          tokenid: tokenId++,
        });
        await hre.run("mint:erc721", {
          account: account,
          tokenaddress: addresses.erc721MockB,
          tokenid: tokenId++,
        });
      }
    }
  });
