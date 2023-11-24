// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./AyaraWalletInstance.sol";
import "./lib/Create2Factory.sol";

contract AyaraController is Create2Factory, Ownable {
    error WalletAlreadyInitialized(address wallet);

    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;
    uint256 public immutable chainId;

    mapping(address => address) public wallets;

    event WalletCreated(address indexed owner, address indexed wallet);

    constructor(
        address proxyAdmin_,
        uint256 salt_,
        uint256 chainId_
    ) Ownable(proxyAdmin_) {
        salt = bytes32(salt_);
        chainId = chainId_;
    }

    function createWallet(
        address owner,
        bytes[] calldata callbacks
    ) external returns (address) {
        // Check if wallet already exists
        if (wallets[owner] != address(0))
            revert WalletAlreadyInitialized(wallets[owner]);

        // Get bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner, address(this), chainId);
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Deploy contract
        address deployedAddress = deploy(0, salt, finalBytecode, callbacks);

        // Save wallet address
        wallets[owner] = deployedAddress;

        // Emit event
        emit WalletCreated(owner, deployedAddress);

        return deployedAddress;
    }
}
