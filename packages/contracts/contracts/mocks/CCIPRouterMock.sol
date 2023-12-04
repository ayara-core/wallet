// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";

contract CCIPRouterMock is IRouterClient {
    event MessageSent(bytes32 messageId);

    // Mapping of chainSelector to the address of the contract
    mapping(uint64 => address) public chainSelectorToContract;
    mapping(address => uint64) public contractToChainSelector;

    function _mockSetChainSelectorsToContracts(
        uint64[] memory chainSelectors,
        address[] memory contractAddresses
    ) external {
        require(
            chainSelectors.length == contractAddresses.length,
            "Input arrays must have the same length"
        );
        for (uint i = 0; i < chainSelectors.length; i++) {
            chainSelectorToContract[chainSelectors[i]] = contractAddresses[i];
            contractToChainSelector[contractAddresses[i]] = chainSelectors[i];
        }
    }

    /// @notice Checks if the given chain ID is supported for sending/receiving.
    /// @param chainSelector The chain to check.
    /// @return supported is true if it is supported, false if not.
    function isChainSupported(
        uint64 chainSelector
    ) external view virtual returns (bool) {
        uint64[3] memory supportedChainSelectors = [
            16015286601757825753,
            2664363617261496610,
            5790810961207155433
        ]; // The supported chain selectors
        for (uint i = 0; i < supportedChainSelectors.length; i++) {
            if (chainSelector == supportedChainSelectors[i]) {
                return true;
            }
        }
        return false;
    }

    /// @notice Gets a list of all supported tokens which can be sent or received
    /// to/from a given chain id.
    /// @param chainSelector The chainSelector.
    /// @return tokens The addresses of all tokens that are supported.
    function getSupportedTokens(
        uint64 chainSelector
    ) external view virtual override returns (address[] memory) {
        address[] memory tokens = new address[](2);
        tokens[0] = address(0); // Replace with actual address
        tokens[1] = address(0); // Replace with actual address
        return tokens;
    }

    /// @param destinationChainSelector The destination chainSelector
    /// @param message The cross-chain CCIP message including data and/or tokens
    /// @return fee returns guaranteed execution fee for the specified message
    /// delivery to destination chain
    /// @dev returns 0 fee on invalid message.
    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external view virtual returns (uint256) {
        return 0.1 * 10 ** 18; // Returns 0.1 Link
    }

    /// @notice Request a message to be sent to the destination chain
    /// @param destinationChainSelector The destination chain ID
    /// @param message The cross-chain CCIP message including data and/or tokens
    /// @return messageId The message ID
    /// @dev Note if msg.value is larger than the required fee (from getFee) we accept
    /// the overpayment with no refund.
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external payable virtual returns (bytes32) {
        bytes32 messageId = keccak256(
            abi.encodePacked(destinationChainSelector, abi.encode(message))
        );
        emit MessageSent(messageId);

        // Now send to the correct contract and call _ccipReceive
        address contractAddress = chainSelectorToContract[
            destinationChainSelector
        ];
        require(contractAddress != address(0), "Contract address not set");

        // Check which was the previous contract that sent the message
        uint64 sourceChainSelector = contractToChainSelector[msg.sender];

        // bytes32 messageId; // MessageId corresponding to ccipSend on source.
        // uint64 sourceChainSelector; // Source chain selector.
        // bytes sender; // abi.decode(sender) if coming from an EVM chain.
        // bytes data; // payload sent in original message.

        // Convert EVM2AnyMessage to Any2EVMMessage
        Client.Any2EVMMessage memory any2EVMMessage = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(msg.sender),
            data: message.data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        // Call _ccipReceive
        CCIPReceiver(contractAddress).ccipReceive(any2EVMMessage);

        return messageId;
    }
}
