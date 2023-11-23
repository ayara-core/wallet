// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./AyaraWalletInstance.sol";
import "./lib/Create2Factory.sol";

contract AyaraController is Create2Factory, Ownable {
    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;

    mapping(address => address) public wallets;

    event WalletCreated(address indexed owner, address indexed wallet);

    constructor(address proxyAdmin_, uint256 salt_) Ownable(proxyAdmin_) {
        salt = bytes32(salt_);
    }

    function createWallet(
        address owner,
        bytes[] calldata callbacks
    ) external returns (address) {
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner, address(this));
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);
        address deployedAddress = deploy(0, salt, finalBytecode, callbacks);

        wallets[owner] = deployedAddress;
        emit WalletCreated(owner, deployedAddress);
        return deployedAddress;
    }
}
