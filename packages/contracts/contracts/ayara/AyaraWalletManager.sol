// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AyaraWalletInstance.sol";
import "../lib/Create2Factory.sol";

contract AyaraWalletManager is Create2Factory {
    error WalletAlreadyInitialized(address wallet);

    mapping(address => address) public wallets;

    event WalletCreated(address indexed owner, address indexed wallet);

    function _createWallet(
        address owner_,
        uint256 chainId_,
        bytes32 salt_
    ) internal returns (address) {
        bytes[] memory callbacks = new bytes[](0);
        return _createWallet(owner_, callbacks, chainId_, salt_);
    }

    function _createWallet(
        address owner_,
        bytes[] memory callbacks_,
        uint256 chainId,
        bytes32 salt
    ) internal returns (address) {
        // Validate if wallet already exists
        if (wallets[owner_] != address(0))
            revert WalletAlreadyInitialized(wallets[owner_]);

        // Generate bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner_, address(this), chainId);
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Deploy contract
        address deployedAddress = deploy(0, salt, finalBytecode, callbacks_);

        // Store wallet address
        wallets[owner_] = deployedAddress;

        // Emit event
        emit WalletCreated(owner_, deployedAddress);

        return deployedAddress;
    }

    function _calculateWalletAddress(
        address owner_,
        uint256 chainId,
        bytes32 salt
    ) internal view returns (address) {
        // Generate bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner_, address(this), chainId);
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Calculate address
        return computeAddress(salt, keccak256(finalBytecode));
    }
}
