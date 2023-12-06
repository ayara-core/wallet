// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../lib/Structs.sol";

/**
 * @title AyaraGasBank
 * @dev This contract is responsible for managing gas fees for the Ayara protocol.
 * It allows users to deposit gas tokens, which can then be used to pay for transaction fees.
 * The contract also provides functions for locking and unlocking gas, as well as charging fees.
 */
contract AyaraGasBank is Ownable {
    using SafeERC20 for IERC20;

    // Errors that could be thrown by the contract
    error NotApprovedGasToken(address token);
    error InvalidAmount(uint256 relayerFee, uint256 maxFee);
    error NotEnoughGas(
        address token,
        uint256 amountNeeded,
        uint256 amountAvailable
    );
    error NativeTokenNotSupported();

    // Events that the contract can emit
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

    event WalletGasSettled(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    // Mappings to store user gas data and approved gas tokens
    mapping(address => UserGasData) private userGasData;
    mapping(address => bool) public isGasToken;

    // Structs to store user gas data and gas data
    struct UserGasData {
        mapping(address => GasData) gasReserves;
    }

    struct GasData {
        uint256 totalAmount;
        uint256 lockedAmount;
        uint256 usedAmount;
    }

    /**
     * @dev Constructor for the AyaraGasBank contract.
     * @param gasTokens_ An array of addresses of the initial gas tokens.
     * @param initialOwner_ The address of the initial owner of the contract.
     */
    constructor(
        address[] memory gasTokens_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        // Initialize gas tokens
        _modifyGasTokens(gasTokens_, true);
    }

    // ----------------- Exterbal View Functions -----------

    /**
     * @dev Returns the gas data for a specific user and token.
     * @param owner_ The address of the user.
     * @param token_ The address of the token.
     * @return gasData The gas data for the user and token.
     */
    function getUserGasData(
        address owner_,
        address token_
    ) external view returns (GasData memory gasData) {
        gasData = userGasData[owner_].gasReserves[token_];
    }

    // ----------------- External Functions -----------------

    /**
     * @dev Modifies the list of approved gas tokens.
     * @param gasTokens_ An array of addresses of the gas tokens to modify.
     * @param enabled_ A boolean indicating whether the gas tokens should be enabled or disabled.
     */
    function modifyGasTokens(
        address[] memory gasTokens_,
        bool enabled_
    ) external onlyOwner {
        _modifyGasTokens(gasTokens_, enabled_);
    }

    // ----------------- Internal Functions -----------------

    /**
     * @dev Internal function to settle the gas for a user and token.
     * @param owner_ The address of the user.
     * @param token_ The address of the token.
     * This function will revert if the token is not approved or if there is not enough gas.
     * This will set the totalAmount, lockedAmount, and usedAmount of gas for the user and token to 0.
     * This will emit a WalletGasSettled event with the owner, token, and available amount.
     */

    // TODO: Untested function
    function _settleGas(
        address owner_,
        address token_
    ) internal returns (uint256 availableAmount) {
        // Check if token is approved
        if (!isGasToken[token_]) revert NotApprovedGasToken(token_);

        // Calculate available amount
        availableAmount = _getAvailableGas(owner_, token_);

        // Check if there is enough gas
        if (availableAmount == 0)
            revert NotEnoughGas(token_, 1, availableAmount);

        // Set allowance of available amount to 0
        userGasData[owner_].gasReserves[token_].totalAmount = 0;
        userGasData[owner_].gasReserves[token_].lockedAmount = 0;
        userGasData[owner_].gasReserves[token_].usedAmount = 0;

        // Emit event
        emit WalletGasSettled(owner_, token_, availableAmount);
    }

    function _finalizeSettlement(
        address owner_,
        address token_,
        uint256 amount_
    ) internal {
        // Check if token is approved
        if (!isGasToken[token_]) revert NotApprovedGasToken(token_);

        // Unlock gas
        userGasData[owner_].gasReserves[token_].lockedAmount -= amount_;

        // Emit event
        emit WalletGasSettled(owner_, token_, amount_);
    }

    /**
     * @dev Returns the available gas for a user and token.
     * @param owner_ The address of the user.
     * @param token_ The address of the token.
     * @return availableGas The available gas for the user and token.
     * Calculated as totalAmount - lockedAmount - usedAmount.
     * (totalAmount is the amount of gas deposited by the user or set as allowance)
     * (lockedAmount is the amount of gas locked by the user, to be used on another chain)
     * (usedAmount is the amount of gas already used by the user)
     */

    function _getAvailableGas(
        address owner_,
        address token_
    ) internal view returns (uint256 availableGas) {
        // Get gas data
        GasData memory gasData = userGasData[owner_].gasReserves[token_];

        // Calculate available gas
        availableGas =
            gasData.totalAmount -
            gasData.lockedAmount -
            gasData.usedAmount;
    }

    /**
     * @dev Internal function to modify the list of approved gas tokens.
     * @param gasTokens_ An array of addresses of the gas tokens to modify.
     * @param enabled_ A boolean indicating whether the gas tokens should be enabled or disabled.
     */
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

    /**
     * @dev Internal function to transfer tokens from a user to the contract and fund the user's wallet.
     * @param owner_ The address of the user.
     * @param token_ The address of the token.
     * @param amount_ The amount of tokens to transfer.
     * This function will revert if the token is not approved, the amount is invalid, or the token is ETH.
     * This will increase the totalAmount of gas for the user and token.
     */
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

    /**
     * @dev Internal function to charge a fee if required.
     * @param owner_ The address of the user.
     * @param feeData_ The fee data.
     * This function will revert if the fee is invalid or there is not enough gas.
     * This will increase the usedAmount of gas for the user and token.
     */
    function _chargeFeeIfRequired(
        address owner_,
        FeeData memory feeData_
    ) internal {
        // Validate if fee is required (relayer might sponsor the fee)
        if (feeData_.relayerFee > 0) _chargeFee(owner_, feeData_);
    }

    /**
     * @dev Internal function to charge a fee.
     * @param owner_ The address of the user.
     * @param feeData_ The fee data.
     * This function will revert if the token is not approved, the fee is invalid, or there is not enough gas.
     * This will increase the usedAmount of gas for the user and token.
     */
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

    /**
     * @dev Internal function to lock a portion of a user's gas.
     * @param owner_ The address of the user.
     * @param token_ The address of the token.
     * @return toLock The amount of gas to lock.
     * This function will revert if the token is not approved.
     * This will increase the lockedAmount of gas for the user and token. And return the amount to lock.
     * This locked amount will then be send to the other chain as allowance.
     * The amount to lock is calculated as a third of the available amount.
     */
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

    /**
     * @dev Internal function to set the allowance for a user.
     * @param owner_ The address of the user.
     * @param token_ The address of the token.
     * @param amount_ The amount to set as the allowance.
     * This function will revert if the token is not approved.
     * This will set the totalAmount of gas for the user and token.
     * This will be called when the user locks gas on another chain.
     * Note: While the totalAmount can be increase by supplying tokens, here we set it based on the locked amount on the other chain.
     */
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
}
