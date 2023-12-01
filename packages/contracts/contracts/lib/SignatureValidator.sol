// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

library SignatureValidator {
    error InvalidSignature();

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

    function STRUCT_TYPEHASH() public pure returns (bytes32) {
        return
            keccak256(
                "Transaction(address ownerAddress,address controllerAddress,uint256 nonce,bytes32 data)"
            );
    }

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
