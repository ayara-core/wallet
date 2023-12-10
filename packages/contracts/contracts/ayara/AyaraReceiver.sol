// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

import "../lib/Structs.sol";

/**
 * @title AyaraReceiver
 * @dev This contract is responsible for handling messages from CCIP.
 */
contract AyaraReceiver is CCIPReceiver {
    // Variables to store the latest message details
    bytes32 latestMessageId;
    uint64 latestSourceChainSelector;
    address latestSender;
    string latestMessage;

    // Event to be emitted when a new message is received
    event MessageReceived(
        bytes32 latestMessageId,
        uint64 latestSourceChainSelector,
        address latestSender
    );

    /**
     * @dev Constructor for the AyaraReceiver contract.
     * @param router_ The address of the router.
     * Initializes the CCIPReceiver with the router address.
     */
    constructor(address router_) CCIPReceiver(router_) {}

    /**
     * @dev Internal function to handle the received message.
     * @param message The message received from the Chainlink network.
     * This function should be overridden by a parent contract.
     * We just add it here to avoid errors.
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal virtual override {
        /* empty */
    }

    /**
     * @dev Function to decode and handle the received message.
     * @param message The message received from the Chainlink network.
     * @return decodedMessage The decoded message.
     * Decodes the received message, updates the latest message details and returns the decoded message.
     * Emits the MessageReceived event with the latest message details.
     * This function should be called by the parent contract from the _ccipReceive function.
     */
    function _handleReceive(
        Client.Any2EVMMessage memory message
    ) internal virtual returns (Message memory decodedMessage) {
        // Decode message, this will return a Message struct
        decodedMessage = abi.decode(message.data, (Message));

        // Store the latest message details
        latestMessageId = message.messageId;
        latestSourceChainSelector = message.sourceChainSelector;
        latestSender = abi.decode(message.sender, (address));

        // Emit the MessageReceived event
        emit MessageReceived(
            latestMessageId,
            latestSourceChainSelector,
            latestSender
        );
    }

    /**
     * @dev Function to get the details of the latest received message.
     * @return latestMessageId The ID of the latest message.
     * @return latestSourceChainSelector The source chain selector of the latest message.
     * @return latestSender The sender of the latest message.
     * @return latestMessage The latest message.
     * Returns the details of the latest received message.
     */
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
