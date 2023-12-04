// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../lib/Structs.sol";

contract AyaraGasBank is Ownable {
    using SafeERC20 for IERC20;

    error NotApprovedGasToken(address token);
    error InvalidAmount(uint256 amountGiven, uint256 amountSupplied);

    event WalletGasFunded(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    event WalletGasCharged(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    event GasTokensModified(address[] tokens, bool enabled);

    mapping(address => UserGasData) private userGasData;
    mapping(address => bool) public isGasToken;

    struct UserGasData {
        mapping(address => GasData) gasReserves;
    }

    struct GasData {
        uint256 totalAmount;
        uint256 lockedAmount;
        uint256 usedAmount;
    }

    constructor(
        address[] memory gasTokens_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        // Initialize gas tokens
        _modifyGasTokens(gasTokens_, true);
    }

    function getUserGasData(
        address owner_,
        address token_
    ) external view returns (GasData memory gasData) {
        gasData = userGasData[owner_].gasReserves[token_];
    }

    function modifyGasTokens(
        address[] memory gasTokens_,
        bool enabled_
    ) external onlyOwner {
        _modifyGasTokens(gasTokens_, enabled_);
    }

    function _modifyGasTokens(
        address[] memory gasTokens_,
        bool enabled_
    ) internal {
        // loop through tokens
        for (uint256 i = 0; i < gasTokens_.length; i++) {
            isGasToken[gasTokens_[i]] = enabled_;
        }
        emit GasTokensModified(gasTokens_, enabled_);
    }

    function _transferAndFundWallet(
        address owner_,
        address token_,
        uint256 amount_
    ) internal {
        // Check if token is approved
        if (!isGasToken[token_]) revert NotApprovedGasToken(token_);

        // Check if amount is valid
        if (amount_ == 0) revert InvalidAmount(amount_, msg.value);

        // Check if is ETH or ERC20
        if (token_ == address(0)) {
            // ETH already transferred, just fund wallet
        } else {
            // Transfer tokens
            IERC20(token_).safeTransferFrom(msg.sender, address(this), amount_);
        }

        // Update gas data
        userGasData[owner_].gasReserves[token_].totalAmount += amount_;

        // Emit event
        emit WalletGasFunded(owner_, token_, amount_);
    }

    function _chargeFee(address owner_, FeeData memory feeData_) internal {
        // Check if token is approved
        if (!isGasToken[feeData_.token])
            revert NotApprovedGasToken(feeData_.token);

        // Check if amount is valid
        if (feeData_.amount == 0)
            revert InvalidAmount(feeData_.amount, msg.value);

        // Update gas data
        userGasData[owner_].gasReserves[feeData_.token].usedAmount += feeData_
            .amount;

        // Emit event
        emit WalletGasCharged(owner_, feeData_.token, feeData_.amount);
    }
}
