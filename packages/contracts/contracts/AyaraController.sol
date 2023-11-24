// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./AyaraWalletInstance.sol";
import "./lib/Create2Factory.sol";

contract AyaraController is Create2Factory, Ownable {
    error WalletAlreadyInitialized(address wallet);
    error WalletNotInitialized(address owner);
    error InvalidAmount(uint256 amountGiven, uint256 amountSupplied);
    error NotApprovedGasToken(address token);
    error OperationFailed();

    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;
    uint256 public immutable chainId;

    mapping(address => bool) public isGasToken;
    mapping(address => address) public wallets;
    mapping(address => UserGasData) private userGasData;

    struct UserGasData {
        mapping(address => GasData) gasReserves;
    }

    struct GasData {
        uint256 totalAmount;
        uint256 lockedAmount;
        uint256 usedAmount;
    }

    event WalletCreated(address indexed owner, address indexed wallet);
    event WalletGasFunded(
        address indexed owner,
        address indexed wallet,
        address indexed token,
        uint256 amount
    );
    event OperationExecuted(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint256 value,
        bytes data,
        bytes signature
    );

    constructor(
        address proxyAdmin_,
        uint256 salt_,
        uint256 chainId_,
        address[] memory gasTokens_
    ) Ownable(proxyAdmin_) {
        salt = bytes32(salt_);
        chainId = chainId_;

        // Add gas tokens
        for (uint256 i = 0; i < gasTokens_.length; i++) {
            isGasToken[gasTokens_[i]] = true;
        }
    }

    function createWallet(
        address owner,
        bytes[] calldata callbacks
    ) external returns (address) {
        // Check if wallet already exists
        if (wallets[owner] != address(0))
            revert WalletAlreadyInitialized(wallets[owner]);

        // Get bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner, address(this), chainId);
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Deploy contract
        address deployedAddress = deploy(0, salt, finalBytecode, callbacks);

        // Save wallet address
        wallets[owner] = deployedAddress;

        // Emit event
        emit WalletCreated(owner, deployedAddress);

        return deployedAddress;
    }

    function fundWallet(
        address owner,
        address token,
        uint256 amount
    ) public payable {
        // fetch wallet address
        address wallet = wallets[owner];

        // check if wallet exists
        if (wallet == address(0)) revert WalletNotInitialized(owner);

        // Check if token is ETH
        if (token == address(0)) {
            // Check if amount is correct
            if (msg.value != amount) revert InvalidAmount(msg.value, amount);
        } else {
            // Check if token is approved as gas token
            if (!isGasToken[token]) revert NotApprovedGasToken(token);
            // Transfer tokens to wallet
            IERC20(token).transferFrom(msg.sender, wallet, amount);
        }
        // Update gas data
        userGasData[owner].gasReserves[token].totalAmount += amount;

        // Emit event
        emit WalletGasFunded(owner, wallet, token, amount);
    }

    function executeUserOperation(
        address owner,
        address wallet,
        address feeToken,
        uint256 feeAmount,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signature
    ) external payable {
        // fetch wallet address
        address recordedWallet = wallets[owner];
        if (wallet != recordedWallet || wallet == address(0))
            revert WalletNotInitialized(owner);

        // Execute operation
        (bool success, ) = AyaraWalletInstance(payable(wallet)).execute(
            to,
            value,
            data,
            signature
        );

        // Check if operation was successful
        if (!success) revert OperationFailed();

        // Check if fee is required
        if (feeAmount > 0) {
            // Update gas data
            userGasData[owner].gasReserves[feeToken].usedAmount += feeAmount;
        }

        // Emit event
        emit OperationExecuted(owner, wallet, to, value, data, signature);
    }
}
