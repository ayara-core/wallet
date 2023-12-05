// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SignatureValidator
 * @dev This library provides functions for validating signatures.
 */
library SignatureValidator {
    error InvalidSignature();

    /**
     * @dev Returns the EIP712 domain separator for the current chain.
     * @param chainId The ID of the current chain.
     * @return The EIP712 domain separator.
     */
    function DOMAIN_SEPARATOR(uint256 chainId) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    ),
                    keccak256(bytes("Ayara")),
                    keccak256(bytes("1")),
                    chainId,
                    address(this)
                )
            );
    }

    /**
     * @dev Returns the EIP712 type hash for a transaction.
     * @return The EIP712 type hash.
     */
    function STRUCT_TYPEHASH() public pure returns (bytes32) {
        return
            keccak256(
                "Transaction(address ownerAddress,address controllerAddress,uint256 nonce,bytes32 data)"
            );
    }

    /**
     * @dev Validates a signature.
     * @param data The data that was signed.
     * @param signature The signature to validate.
     * @param chainId The ID of the current chain.
     * @param ownerAddress The address of the signer.
     * @param controllerAddress The address of the controller.
     * @param nonce The nonce used in the signature.
     * @return True if the signature is valid, reverts with InvalidSignature if not.
     */
    function validateSignature(
        bytes memory data,
        bytes memory signature,
        uint256 chainId,
        address ownerAddress,
        address controllerAddress,
        uint256 nonce
    ) internal view returns (bool) {
        bytes32 messageHashClaimer = MessageHashUtils.toTypedDataHash(
            DOMAIN_SEPARATOR(chainId),
            keccak256(
                abi.encode(
                    STRUCT_TYPEHASH(),
                    ownerAddress,
                    controllerAddress,
                    nonce,
                    keccak256(data)
                )
            )
        );

        if (
            !SignatureChecker.isValidSignatureNow(
                ownerAddress,
                messageHashClaimer,
                signature
            )
        ) revert InvalidSignature();

        return true;
    }
}
