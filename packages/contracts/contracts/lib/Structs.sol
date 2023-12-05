// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

struct Message {
    address owner;
    address wallet;
    address to;
    bytes data;
    bytes signature;
    address token;
    uint256 lockedAmount;
}

struct Transaction {
    uint64 destinationChainId;
    address to;
    uint256 value;
    bytes data;
    bytes signature;
}

struct FeeData {
    address token;
    uint256 maxFee;
    uint256 relayerFee;
}
