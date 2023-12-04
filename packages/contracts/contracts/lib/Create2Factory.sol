// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title   Create2Factory
 * @notice  Deploy contracts using CREATE2 opcode.
 */
contract Create2Factory {
    event Deployed(bytes32 indexed salt, address deployed);

    receive() external payable {}

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

    function _execute(
        address _to,
        bytes memory _data
    ) private returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call(_data);
        require(success, "!success");

        return (success, result);
    }

    function computeAddress(
        bytes32 salt,
        bytes32 codeHash
    ) public view returns (address) {
        return Create2.computeAddress(salt, codeHash);
    }
}
