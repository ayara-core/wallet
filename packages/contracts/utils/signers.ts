import type { HardhatRuntimeEnvironment } from "hardhat/types";

export async function getCommonSigners(hre: HardhatRuntimeEnvironment) {
  const [deployer, relayer, alice, bob] = await hre.ethers.getSigners();
  return { deployer, relayer, alice, bob };
}

export async function getDeployer(hre: HardhatRuntimeEnvironment) {
  const { deployer } = await getCommonSigners(hre);
  return deployer;
}
