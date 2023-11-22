import { subtask, task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { getDeployer } from "../utils/signers";
import { logger } from "../utils/deployUtils";
const info = logger("info", "task");
const log = logger("log", "task");

subtask("send:eth")
  .addParam("account", "Address to send ETH to", undefined, types.string)
  .addParam("amount", "Amount to send", 1, types.int)
  .setAction(
    async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      info(`Subtask send:eth ${taskArguments.account}`);

      const deployer = await getDeployer(hre);
      const balance = await hre.ethers.provider.getBalance(deployer);

      const wallet = taskArguments.account;

      log("Deployer balance: ", hre.ethers.parseEther(balance.toString()));
      log("Sending to: ", wallet);

      const tx = await deployer.sendTransaction({
        to: wallet,
        value: hre.ethers.parseEther(taskArguments.amount.toString()),
      });
      const balanceNew = await hre.ethers.provider.getBalance(wallet);

      log("Transaction hash: ", tx.hash);
      log("New balance: ", balanceNew.toString());
    }
  );

task("send:eth").setAction(async (_, __, runSuper) => {
  return runSuper();
});
subtask("mint:erc20")
  .addParam(
    "account",
    "Address to send the ERC20Mock to",
    undefined,
    types.string
  )
  .addParam("tokenaddress", "Address of the ERC20Mock", undefined, types.string)
  .addOptionalParam("amount", "The amount, default 1000", 1000, types.int)
  .setAction(
    async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      info(
        `Subtask mint:erc20  Token: ${taskArguments.tokenaddress}  Account: ${taskArguments.account}`
      );
      const deployer = await getDeployer(hre);
      const wallet = taskArguments.account;
      const amount = hre.ethers.parseEther(taskArguments.amount.toString());

      log("Sending to: ", wallet);

      const token = await hre.ethers.getContractAt(
        "ERC20Mock",
        taskArguments.tokenaddress,
        deployer
      );

      const tx = await token.mint(wallet, amount);
      const balanceNew = await token.balanceOf(wallet);

      log("Transaction hash: ", tx.hash);
      log("New balance: ", balanceNew.toString());
    }
  );
