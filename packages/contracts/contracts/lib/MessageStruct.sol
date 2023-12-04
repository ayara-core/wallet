// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

struct Message {
    address owner;
    address wallet;
    address to;
    bytes data;
    bytes signature;
}
