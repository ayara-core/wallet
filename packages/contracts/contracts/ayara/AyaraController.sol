// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/Structs.sol";

import "./AyaraGasBank.sol";
import "./AyaraWalletManager.sol";
import "./AyaraWalletInstance.sol";

/**
 * @title AyaraController
 * @dev This is the main contract for the Ayara protocol. It is responsible for creating and managing wallets, as well as executing user operations.
 * It receives CCIP messages from the router contract, and executes the user operations on this chain or another chain.
 */
contract AyaraController is AyaraGasBank, AyaraWalletManager {
    // Immutable variables & constants
    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;
    uint256 public immutable chainId;

    error InvalidWallet(address wallet, address expectedWallet);

    /**
     * @dev Constructor for AyaraController contract.
     *
     * @param initialOwner_ The initial owner of the contract.
     * @param salt_ Unique value for generating deterministic wallet addresses.
     * @param chainId_ Identifier of the blockchain network where contract is deployed.
     * @param gasTokens_ Addresses for the gas token contracts.
     * @param router_ Address of the router contract.
     * @param link_ Address of the link contract.
     */
    constructor(
        address initialOwner_,
        bytes32 salt_,
        uint256 chainId_,
        address[] memory gasTokens_,
        address router_,
        address link_
    )
        AyaraWalletManager(router_, link_)
        AyaraGasBank(gasTokens_, initialOwner_)
    {
        salt = salt_;
        chainId = chainId_;
    }

    // ----------------- Redirects to AyaraWalletManager -----------------

    /**
     * @dev Calculates the wallet address for a given owner.
     * @param owner_ The address of the owner.
     * @return The calculated wallet address.
     */
    function calculateWalletAddress(
        address owner_
    ) external view returns (address) {
        return _calculateWalletAddress(owner_, chainId, salt);
    }

    /**
     * @dev Creates a new wallet for a given owner and a set of callbacks.
     * @param owner_ The address of the owner.
     * @param callbacks_ An array of callback data.
     * @return The address of the newly created wallet.
     */
    function createWallet(
        address owner_,
        bytes[] calldata callbacks_
    ) external returns (address) {
        return _createWallet(owner_, callbacks_, chainId, salt);
    }

    // ----------------- Redirects to AyaraGasBank -----------------

    /**
     * @dev Adds funds to the wallet of a given owner.
     * @param owner_ The address of the owner.
     * @param token_ The address of the token to add.
     * @param amount_ The amount of the token to add.
     */
    function addFundsToWallet(
        address owner_,
        address token_,
        uint256 amount_
    ) public payable {
        // Create wallet if not exists
        _createWalletIfNotExists(owner_, chainId, salt);

        // Add funds to wallet
        _transferAndFundWallet(owner_, token_, amount_);
    }

    // ----------------- User Operations -----------------

    /**
     * @dev Executes a user operation.
     * @param owner_ The address of the owner.
     * @param wallet_ The address of the wallet.
     * @param feeData_ The fee data.
     * @param transaction_ The transaction data.
     * This function will create a wallet if it does not exist, charge a fee if required,
     * and execute the user operation. If the destination chain ID matches the current chain ID,
     * the operation will be executed on this chain. Otherwise, it will be executed on another chain.
     */
    function executeUserOperation(
        address owner_,
        address wallet_,
        FeeData memory feeData_,
        Transaction memory transaction_
    ) external payable {
        // Create wallet if not exists
        address wallet = _createWalletIfNotExists(owner_, chainId, salt);
        if (wallet != wallet_) revert InvalidWallet(wallet, wallet_);

        // Charge fee if required
        _chargeFeeIfRequired(owner_, feeData_);

        // Execute user operation
        if (transaction_.destinationChainId == chainId) {
            // execute on this chain
            _executeUserOperationThisChain(owner_, wallet_, transaction_);
        } else {
            // lock gas first on source chain, then execute on another chain
            uint256 lockedAmount = _lockGas(owner_, feeData_.token);
            // execute on another chain, passing the locked amount as allowance
            _executeUserOperationOtherChain(
                owner_,
                wallet_,
                transaction_,
                feeData_.token,
                lockedAmount
            );
        }
    }

    // ----------------- CCIP -----------------

    /**
     * @dev Handles the receipt of a CCIP message.
     * @param ccipMessage The CCIP message to handle.
     * This function will create a wallet if it does not exist, set an allowance if required,
     * and execute the user operation on this chain.
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory ccipMessage
    ) internal override {
        // Handle the received CCIP message, this will emit an event and return a decoded message
        Message memory message = _handleReceive(ccipMessage);

        // Get the recorded wallet for the message owner
        address recordedWallet = wallets[message.owner];
        address createdWallet;
        // If no wallet is recorded, create a new one
        if (recordedWallet == address(0))
            createdWallet = _createWalletIfNotExists(
                message.owner,
                chainId,
                salt
            );

        // Set allowance for the message owner if required
        _setAllowance(message.owner, message.token, message.lockedAmount);

        // Create a transaction from the message data
        Transaction memory transaction = Transaction({
            destinationChainId: 0,
            to: message.to,
            value: 0,
            data: message.data,
            signature: message.signature
        });

        // Execute the user operation on this chain
        _executeUserOperationThisChain(
            message.owner,
            createdWallet,
            transaction
        );
    }
}
