// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AyaraWalletInstance.sol";
import "./AyaraMessageHandler.sol";
import "../lib/Create2Factory.sol";

import "../lib/Structs.sol";

contract AyaraWalletManager is AyaraMessageHandler, Create2Factory {
    error WalletAlreadyInitialized(address wallet);
    error OperationFailed();

    mapping(address => address) public wallets;

    event WalletCreated(address indexed owner, address indexed wallet);

    event OperationExecuted(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint256 value,
        bytes data,
        bytes signature
    );

    event OperationExecutionSent(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint64 destinationChainId,
        bytes data,
        bytes signature
    );

    constructor(
        address router_,
        address link_
    ) AyaraMessageHandler(router_, link_) {}

    function _createWalletIfNotExists(
        address owner_,
        uint256 chainId_,
        bytes32 salt_
    ) internal returns (address) {
        // Check if wallet already exists
        if (wallets[owner_] != address(0)) return wallets[owner_];

        // Create wallet
        return _createWallet(owner_, chainId_, salt_);
    }

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

    function _executeUserOperationThisChain(
        address owner_,
        address wallet_,
        Transaction memory transaction_
    ) internal returns (bool success) {
        // Perform operation
        (success, ) = AyaraWalletInstance(payable(wallet_)).execute(
            transaction_.to,
            transaction_.value,
            transaction_.data,
            transaction_.signature
        );

        // Validate if operation was successful
        if (!success) revert OperationFailed();

        // Emit event
        emit OperationExecuted(
            owner_,
            wallet_,
            transaction_.to,
            transaction_.value,
            transaction_.data,
            transaction_.signature
        );
    }

    function _executeUserOperationOtherChain(
        address owner_,
        address wallet_,
        Transaction memory transaction_,
        address token_,
        uint256 lockedAmount_
    ) internal {
        // Send exection via AyaraMessenger to the other chain
        _routeMessage(owner_, wallet_, transaction_, token_, lockedAmount_);

        // Emit event
        emit OperationExecutionSent(
            owner_,
            wallet_,
            transaction_.to,
            transaction_.destinationChainId,
            transaction_.data,
            transaction_.signature
        );
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
