// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @dev Represents a message for CCIP
 */
struct Message {
    address owner; // The owner of the wallet
    address wallet; // The wallet instance
    address to; // The recipient of the message
    bytes data; // The data contained in the message
    bytes signature; // The signature of the message
    address token; // The token used for Fee
    uint256 lockedAmount; // The updated locked amount
}

/**
 * @dev Represents a transaction in the system.
 */
struct Transaction {
    uint64 destinationChainId; // The destination chain ID of the transaction
    address to; // The recipient of the transaction
    uint256 value; // The value of the transaction
    bytes data; // The data contained in the transaction
    bytes signature; // The signature of the transaction
}

/**
 * @dev Represents the fee data in the system.
 */
struct FeeData {
    address token; // The token associated with the fee
    uint256 maxFee; // The maximum fee, set by the user
    uint256 relayerFee; // The fee for the relayer, set by the relayer
}
