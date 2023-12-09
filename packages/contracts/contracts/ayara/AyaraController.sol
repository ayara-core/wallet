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
        return _calculateWalletAddress(owner_, salt);
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
        return _createWallet(owner_, callbacks_, salt);
    }

    // ----------------- Redirects to AyaraGasBank -----------------

    /**
     * @dev Adds funds to the wallet of a given owner.
     * @param owner_ The address of the owner.
     * @param token_ The address of the token to add.
     * @param amount_ The amount of the token to add.
     * This function will create a wallet if it does not exist, and add funds to the wallet.
     */
    function addFundsToWallet(
        address owner_,
        address token_,
        uint256 amount_
    ) public payable {
        // Create wallet if not exists
        _createWalletIfNotExists(owner_, salt);

        // Add funds to wallet, uses tranferFrom and updates gasData
        _transferAndFundWallet(owner_, token_, amount_);
    }

    // ----------------- Settlements -------------

    /**
     * @dev Initiates the settlement process.
     * @param owner_ The address of the owner.
     * @param token_ The address of the token to settle.
     * @param destinationChainId_ The ID of the destination chain.
     * @param ayaraController_ The address of the AyaraController.
     * @param ccipGasLimit_ The gas limit for the CCIP message.
     * This function settles the gas, updates the amounts, and returns the amount that can be unlocked on the other chain.
     * It then encodes a message with the owner, wallet, token, and locked amount.
     * A transaction is created with the destination chain ID, AyaraController address, and the encoded message.
     * Finally, it sends a CCIP message to the other chain.
     */
    function initiateSettlement(
        address owner_,
        address token_,
        uint64 destinationChainId_,
        address ayaraController_,
        uint256 ccipGasLimit_
    ) external {
        // Settle gas, updates the amounts and returns the amount that can be unlocked on the other chain
        uint256 amount = _settleGas(owner_, token_);

        // Create the Transaction object
        Transaction memory transaction = Transaction({
            destinationChainId: destinationChainId_,
            to: ayaraController_,
            value: 0,
            data: "",
            signature: ""
        });

        // Send CCIP message to other chain
        _routeMessage(
            owner_,
            wallets[owner_],
            transaction,
            token_,
            amount,
            ccipGasLimit_
        );
    }

    /**
     * @dev Finalizes the settlement process.
     * @param owner_ The address of the owner.
     * @param token_ The address of the token to settle.
     * @param amount_ The amount to be settled.
     * This function finalizes the gas settlement, updates the amounts and returns the amount that can be unlocked on the other chain.
     */
    function finalizeSettlement(
        address owner_,
        address token_,
        uint256 amount_
    ) external {
        _finalizeSettlement(owner_, token_, amount_);
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
        address wallet = _createWalletIfNotExists(owner_, salt);
        // Check that the wallet is correct
        if (wallet != wallet_) revert InvalidWallet(wallet, wallet_);

        // Execute user operation, either on this chain or another chain
        if (transaction_.destinationChainId == chainId) {
            // execute on this chain
            _executeUserOperationThisChain(owner_, wallet_, transaction_);
        } else {
            // lock gas first on source chain, then execute on another chain
            uint256 lockedAmount = _lockGas(owner_, feeData_.tokenSource);
            // execute on another chain, passing the locked amount as allowance
            uint256 crossChainFee = _executeUserOperationOtherChain(
                owner_,
                wallet_,
                transaction_,
                feeData_.tokenDestination,
                lockedAmount,
                feeData_.ccipGasLimit
            );

            // Update fee data to include cross chain fee from CCIP
            feeData_.relayerFee = feeData_.relayerFee + crossChainFee;
        }
        // Charge fee if required
        _chargeFeeIfRequired(owner_, feeData_);
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

        // If the message is directed to this contract, then we just finalize the settlement
        if (message.to == address(this)) {
            // Finalize the settlement, unlocking the amount on this chain
            _finalizeSettlement(
                message.owner,
                message.token,
                message.lockedAmount
            );
            // Return here to avoid executing the user operation
            return;
        }

        // Continue with the user operation, the message is not directed to this contract
        //
        // Get the recorded wallet for the message owner
        address wallet = wallets[message.owner];

        // If no wallet is recorded, create a new one
        if (wallet == address(0))
            wallet = _createWalletIfNotExists(message.owner, salt);

        // Set allowance for the message owner if required, this assumes that the owner has locked the amount on the other chain
        _setAllowance(message.owner, message.token, message.lockedAmount);

        // Create a transaction from the message data for execution on this chain
        Transaction memory transaction = Transaction({
            destinationChainId: 0,
            to: message.to,
            value: 0,
            data: message.data,
            signature: message.signature
        });

        // Execute the user operation on this chain
        _executeUserOperationThisChain(message.owner, wallet, transaction);
    }
}
