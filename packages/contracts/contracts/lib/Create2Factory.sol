// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title   Create2Factory
 * @dev  Deploy contracts using CREATE2 opcode. This contract allows for the deployment of other contracts using the CREATE2 opcode.
 * It also provides utility functions to compute the address of a contract before it is deployed.
 */
contract Create2Factory {
    // Event emitted when a contract is deployed
    event Deployed(bytes32 indexed salt, address deployed);

    // Fallback function to receive ether
    receive() external payable {}

    /**
     * @dev Deploys a contract using the CREATE2 opcode.
     * @param amount The amount of ether to send to the new contract.
     * @param salt A salt to ensure the uniqueness of the deployed contract.
     * @param bytecode The bytecode of the contract to be deployed.
     * @param callbacks An array of function calls to be made after the contract is deployed.
     * @return The address of the deployed contract.
     */
    function deploy(
        uint256 amount,
        bytes32 salt,
        bytes memory bytecode,
        bytes[] memory callbacks
    ) public returns (address) {
        address deployedAddress = Create2.deploy(amount, salt, bytecode);
        uint256 len = callbacks.length;
        if (len > 0) {
            for (uint256 i = 0; i < len; i++) {
                _execute(deployedAddress, callbacks[i]);
            }
        }

        emit Deployed(salt, deployedAddress);

        return deployedAddress;
    }

    /**
     * @dev Executes a function call on a contract.
     * @param _to The address of the contract to call.
     * @param _data The function call data.
     * @return success A boolean indicating whether the function call was successful.
     * @return result The data returned by the function call.
     */
    function _execute(
        address _to,
        bytes memory _data
    ) private returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call(_data);
        require(success, "!success");

        return (success, result);
    }

    /**
     * @dev Computes the address of a contract that would be deployed using the CREATE2 opcode.
     * @param salt A salt to ensure the uniqueness of the computed address.
     * @param codeHash The keccak256 hash of the contract's bytecode.
     * @return The address that the contract would have if it was deployed using the provided salt and codeHash.
     */
    function computeAddress(
        bytes32 salt,
        bytes32 codeHash
    ) public view returns (address) {
        return Create2.computeAddress(salt, codeHash);
    }
}
