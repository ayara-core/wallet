// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

import "../lib/Structs.sol";

contract AyaraReceiver is CCIPReceiver {
    bytes32 latestMessageId;
    uint64 latestSourceChainSelector;
    address latestSender;
    string latestMessage;

    event MessageReceived(
        bytes32 latestMessageId,
        uint64 latestSourceChainSelector,
        address latestSender
    );

    constructor(address router_) CCIPReceiver(router_) {}

    function ccipReceive(
        uint64,
        Client.Any2EVMMessage memory message
    ) external {
        _ccipReceive(message);
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal virtual override {
        // This function should be overridden by a parent contract,
        // We just add it here to avoid errors
    }

    function _handleReceive(
        Client.Any2EVMMessage memory message
    ) internal virtual returns (Message memory decodedMessage) {
        decodedMessage = abi.decode(message.data, (Message));

        latestMessageId = message.messageId;
        latestSourceChainSelector = message.sourceChainSelector;
        latestSender = abi.decode(message.sender, (address));

        emit MessageReceived(
            latestMessageId,
            latestSourceChainSelector,
            latestSender
        );
    }

    function getLatestMessageDetails()
        public
        view
        returns (bytes32, uint64, address, string memory)
    {
        return (
            latestMessageId,
            latestSourceChainSelector,
            latestSender,
            latestMessage
        );
    }
}
