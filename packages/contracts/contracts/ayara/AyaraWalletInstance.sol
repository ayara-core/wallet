// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/SignatureValidator.sol";

/**
 * @title AyaraWalletInstance
 * @dev This contract is a wallet instance that supports execution of arbitrary calls.
 * It is created for each user and each chain by the AyaraController contract (AyaraWalletManager).
 */
contract AyaraWalletInstance {
    error InsufficientBalance(uint256 balance, uint256 value);
    error ExecutionFailed(bytes data);
    error InvalidNonce(uint256 givenNonce, uint256 expectedNonce);

    uint256 public constant VERSION = 1;

    address public immutable ownerAddress;
    address public immutable controllerAddress;
    uint256 public immutable chainId;
    uint256 public nonce;
    uint256 public mainWalletChainId;

    receive() external payable {}

    /**
     * @dev Initializes the contract setting the owner and controller addresses.
     * @param ownerAddress_ The address of the owner.
     * @param controllerAddress_ The address of the controller.
     * @param chainId_ The chain ID.
     */
    constructor(
        address ownerAddress_,
        address controllerAddress_,
        uint256 chainId_
    ) {
        ownerAddress = ownerAddress_;
        controllerAddress = controllerAddress_;
        chainId = chainId_;
        nonce = 0;
    }

    /**
     * @dev Modifier that checks if the sender is the owner or has a valid signature.
     * @param data The data to be validated.
     * @param signature The signature to be validated.
     */
    modifier onlyOwnerOrValidSignature(
        bytes memory data,
        bytes memory signature
    ) {
        if (msg.sender == ownerAddress) {
            _;
        } else {
            SignatureValidator.validateSignature(
                data,
                signature,
                chainId,
                ownerAddress,
                controllerAddress,
                nonce
            );
            _;
        }
    }

    /**
     * @dev Executes an arbitrary call.
     * @param to The address to execute the call to.
     * @param value The value to be sent with the call.
     * @param data The data to be sent with the call.
     * @param signature The signature to be validated.
     * @return success A boolean indicating whether the execution was successful.
     * @return result The result of the execution.
     * This function can only be called by the owner or by a sender with a valid signature.
     * This function simply executes the call, but it is called by the AyaraController contract (AyaraWalletManager).
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signature
    )
        external
        payable
        onlyOwnerOrValidSignature(data, signature)
        returns (bool success, bytes memory result)
    {
        // Check that the contract has enough balance to execute the call
        if (address(this).balance < value) {
            revert InsufficientBalance(uint256(address(this).balance), value);
        }

        return _execute(to, value, data);
    }

    /**
     * @dev Internal function to execute a call.
     * @param to The address to execute the call to.
     * @param value The value to be sent with the call.
     * @param data The data to be sent with the call.
     * @return success A boolean indicating whether the execution was successful.
     * @return result The result of the execution.
     */
    function _execute(
        address to,
        uint256 value,
        bytes calldata data
    ) private returns (bool success, bytes memory result) {
        (success, result) = to.call{value: value}(data);
        if (!success) {
            revert ExecutionFailed(data);
        }

        nonce++;

        return (success, result);
    }
}
