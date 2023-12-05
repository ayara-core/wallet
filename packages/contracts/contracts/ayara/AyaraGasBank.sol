// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../lib/Structs.sol";

contract AyaraGasBank is Ownable {
    using SafeERC20 for IERC20;

    error NotApprovedGasToken(address token);
    error InvalidAmount(uint256 relayerFee, uint256 maxFee);
    error NotEnoughGas(
        address token,
        uint256 amountNeeded,
        uint256 amountAvailable
    );
    error NativeTokenNotSupported();

    event WalletGasLocked(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    event WalletGasFunded(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    event WalletGasCharged(
        address indexed owner,
        address indexed token,
        uint256 maxFee,
        uint256 relayerFee
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
            revert NativeTokenNotSupported();
        } else {
            // Transfer tokens
            IERC20(token_).safeTransferFrom(owner_, address(this), amount_);
        }

        // Update gas data
        userGasData[owner_].gasReserves[token_].totalAmount += amount_;

        // Emit event
        emit WalletGasFunded(owner_, token_, amount_);
    }

    function _chargeFeeIfRequired(
        address owner_,
        FeeData memory feeData_
    ) internal {
        // Validate if fee is required (relayer might sponsor the fee)
        if (feeData_.relayerFee > 0) _chargeFee(owner_, feeData_);
    }

    function _chargeFee(address owner_, FeeData memory feeData_) internal {
        // Check if token is approved
        if (!isGasToken[feeData_.token])
            revert NotApprovedGasToken(feeData_.token);

        // Check if relayer fee is valid
        if (feeData_.relayerFee > feeData_.maxFee)
            revert InvalidAmount(feeData_.relayerFee, feeData_.maxFee);

        // Get gas data
        GasData memory gasData = userGasData[owner_].gasReserves[
            feeData_.token
        ];

        // Calculate available amount
        uint256 availableAmount = _getAvailableGas(owner_, feeData_.token);

        // Check if there is enough gas
        if (availableAmount < feeData_.relayerFee)
            revert NotEnoughGas(
                feeData_.token,
                feeData_.maxFee,
                gasData.totalAmount
            );

        // Update gas data
        userGasData[owner_].gasReserves[feeData_.token].usedAmount += feeData_
            .relayerFee;

        // Emit event
        emit WalletGasCharged(
            owner_,
            feeData_.token,
            feeData_.maxFee,
            feeData_.relayerFee
        );
    }

    function _lockGas(
        address owner_,
        address token_
    ) internal returns (uint256 toLock) {
        // Check if token is approved
        if (!isGasToken[token_]) revert NotApprovedGasToken(token_);

        // Get available amount
        uint256 availableAmount = _getAvailableGas(owner_, token_);

        // Calculate a third of the available amount
        toLock = availableAmount / 3;

        // Update gas data
        userGasData[owner_].gasReserves[token_].lockedAmount += toLock;

        emit WalletGasLocked(owner_, token_, toLock);
    }

    function _setAllowance(
        address owner_,
        address token_,
        uint256 amount_
    ) internal {
        // Check if token is approved
        if (!isGasToken[token_]) revert NotApprovedGasToken(token_);

        // Set allowance
        userGasData[owner_].gasReserves[token_].totalAmount = amount_;

        // Emit event
        emit WalletGasFunded(owner_, token_, amount_);
    }

    function _getAvailableGas(
        address owner_,
        address token_
    ) internal view returns (uint256) {
        // Get gas data
        GasData memory gasData = userGasData[owner_].gasReserves[token_];

        // Calculate available amount
        uint256 availableAmount = gasData.totalAmount -
            gasData.lockedAmount -
            gasData.usedAmount;

        return availableAmount;
    }
}
