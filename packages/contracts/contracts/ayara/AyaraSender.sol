// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../lib/Structs.sol";

/**
 * @title AyaraSender
 * @dev This contract is responsible for sending messages to CCIP.
 */
contract AyaraSender {
    enum PayFeesIn {
        NATIVE,
        LINK
    }

    address public immutable router;
    address public immutable link;

    event MessageSent(bytes32 indexed messageId);

    /**
     * @dev Constructor for the AyaraSender contract.
     * @param router_ The address of the router.
     * @param link_ The address of the link.
     * Initializes the router and link addresses.
     */
    constructor(address router_, address link_) {
        router = router_;
        link = link_;
    }

    /**
     * @dev Internal function to send a message.
     * @param destinationChainSelector The selector of the destination chain.
     * @param destinationAddress The address of the destination contract.
     * @param data_ The data to be sent.
     * @param ccipGasLimit The gas limit for the message.
     * Sends a message to the destination chain.
     * This function is called by the parent contract.
     */
    function _sendMessage(
        uint64 destinationChainSelector,
        address destinationAddress,
        bytes memory data_,
        uint256 ccipGasLimit
    ) internal returns (uint256 fee) {
        // We pay fees in LINK
        PayFeesIn payFeesIn = PayFeesIn.LINK;

        // Prepare the message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationAddress),
            data: data_,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                // Additional arguments, setting gas limit and non-strict sequencing mode
                Client.EVMExtraArgsV1({gasLimit: ccipGasLimit, strict: false})
            ),
            feeToken: payFeesIn == PayFeesIn.LINK ? link : address(0)
        });

        fee = IRouterClient(router).getFee(destinationChainSelector, message);

        bytes32 messageId;

        if (payFeesIn == PayFeesIn.LINK) {
            // Approve the router to spend the fee
            IERC20(link).approve(router, fee);

            // Send the message
            messageId = IRouterClient(router).ccipSend(
                destinationChainSelector,
                message
            );
        } else {
            // Send the message, paying the fee in native tokens
            // Currently, not implemented
            messageId = IRouterClient(router).ccipSend{value: fee}(
                destinationChainSelector,
                message
            );
        }

        emit MessageSent(messageId);
    }

    /**
     * @notice Returns the router fee for a given destination chain and message.
     * @param destinationChainSelector The selector of the destination chain.
     * @param message The EVM2AnyMessage to be sent.
     * @return The fee for the router.
     */
    function getRouterFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) public view returns (uint256) {
        // Returns an estimation of the fee based on what the router would charge with a given message
        return IRouterClient(router).getFee(destinationChainSelector, message);
    }
}
