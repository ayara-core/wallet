// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AyaraWalletInstance.sol";
import "./AyaraMessageHandler.sol";
import "../lib/Create2Factory.sol";

import "../lib/Structs.sol";

/**
 * @title AyaraWalletManager
 * @dev This contract manages the creation and execution of operations on AyaraWalletInstances.
 * It uses the Create2Factory library to create deterministic wallet addresses, each user owns a wallet on each chain.
 */
contract AyaraWalletManager is AyaraMessageHandler, Create2Factory {
    error WalletAlreadyInitialized(address wallet);
    error OperationFailed();

    // Mapping of owner addresses to their wallet addresses
    mapping(address => address) public wallets;

    // Event emitted when a new wallet is created
    event WalletCreated(address indexed owner, address indexed wallet);

    // Event emitted when an operation is executed
    event OperationExecuted(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint256 value,
        bytes data,
        bytes signature
    );

    // Event emitted when an operation execution is sent to another chain
    event OperationExecutionSent(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint64 destinationChainId,
        bytes data,
        bytes signature
    );

    /**
     * @dev Constructor for AyaraWalletManager contract.
     * @param router_ The address of the router.
     * @param link_ The address of the link.
     */
    constructor(
        address router_,
        address link_
    ) AyaraMessageHandler(router_, link_) {}

    /**
     * @dev Internal function to create a wallet if it does not exist.
     * @param owner_ The address of the wallet owner.
     * @param salt_ The salt.
     * @return The address of the created wallet.
     * If the wallet already exists, it returns the address of the existing wallet.
     */
    function _createWalletIfNotExists(
        address owner_,
        bytes32 salt_
    ) internal returns (address) {
        // Check if wallet already exists
        if (wallets[owner_] != address(0)) return wallets[owner_];

        // Create wallet
        return _createWallet(owner_, salt_);
    }

    /**
     * @dev Internal function to create a wallet.
     * @param owner_ The address of the wallet owner.
     * @param salt_ The salt.
     * @return The address of the created wallet.
     */
    function _createWallet(
        address owner_,
        bytes32 salt_
    ) internal returns (address) {
        bytes[] memory callbacks = new bytes[](0);
        return _createWallet(owner_, callbacks, salt_);
    }

    /**
     * @dev Internal function to create a wallet with callbacks.
     * @param owner_ The address of the wallet owner.
     * @param callbacks_ The callbacks.
     * @param salt The salt.
     * @return The address of the created wallet.
     * This function uses the Create2Factory library to create a deterministic wallet address.
     */
    function _createWallet(
        address owner_,
        bytes[] memory callbacks_,
        bytes32 salt
    ) internal returns (address) {
        // Validate if wallet already exists
        if (wallets[owner_] != address(0))
            revert WalletAlreadyInitialized(wallets[owner_]);

        // Generate bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner_, address(this));
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Deploy contract
        address deployedAddress = deploy(0, salt, finalBytecode, callbacks_);

        // Store wallet address
        wallets[owner_] = deployedAddress;

        // Emit event
        emit WalletCreated(owner_, deployedAddress);

        return deployedAddress;
    }

    /**
     * @dev Internal function to execute a user operation on this chain.
     * @param owner_ The address of the wallet owner.
     * @param wallet_ The address of the wallet.
     * @param transaction_ The transaction to be executed.
     * @return success A boolean indicating whether the execution was successful.
     * Calls the execute function of the AyaraWalletInstance contract.
     */
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

    /**
     * @dev Internal function to execute a user operation on another chain.
     * @param owner_ The address of the wallet owner.
     * @param wallet_ The address of the wallet.
     * @param transaction_ The transaction to be executed.
     * @param token_ The token to be used.
     * @param lockedAmount_ The amount to be locked.
     * Calls the _routeMessage function of the AyaraMessageHandler contract.
     * Emits an OperationExecutionSent event.
     */
    function _executeUserOperationOtherChain(
        address owner_,
        address wallet_,
        Transaction memory transaction_,
        address token_,
        uint256 lockedAmount_,
        uint256 ccipGasLimit_
    ) internal returns (uint256 fee) {
        // Send exection via AyaraMessenger to the other chain
        fee = _routeMessage(
            owner_,
            wallet_,
            transaction_,
            token_,
            lockedAmount_,
            ccipGasLimit_
        );

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

    /**
     * @dev Internal function to calculate the address of a wallet.
     * @param owner_ The address of the wallet owner.
     * @param salt The salt.
     * @return The address of the calculated wallet.
     * Precalculates the address of a wallet using the Create2Factory library.
     */
    function _calculateWalletAddress(
        address owner_,
        bytes32 salt
    ) internal view returns (address) {
        // Generate bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner_, address(this));
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Calculate address
        return computeAddress(salt, keccak256(finalBytecode));
    }
}
