// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AxionGuard.sol";
import "./AxionArk.sol";

/**
 * @title AxionVault
 * @notice Example protected vault.
 * Ordinary withdrawals are guarded by AxionGuard.
 * If the threat level trips, emergency recovery allows transferring vault ownership
 * to a fresh recipient if backed by a valid pre-Moment AxionArk key commitment.
 */
contract AxionVault is AxionGuard {
    AxionArk public immutable ark;
    address public owner;

    event Deposit(address indexed sender, uint256 amount);
    event Withdrawal(address indexed recipient, uint256 amount);
    event EmergencyMigration(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "AxionVault: caller not owner");
        _;
    }

    constructor(
        IAxionOracle _oracle,
        AxionArk _ark,
        IAxionOracle.ThreatLevel _tripThreshold
    ) AxionGuard(_oracle, _tripThreshold) {
        ark = _ark;
        owner = msg.sender;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Normal withdrawal, protected by quantumSafe modifier.
     */
    function withdraw(uint256 amount, address payable to) external onlyOwner quantumSafe {
        require(amount <= address(this).balance, "AxionVault: insufficient balance");
        to.transfer(amount);
        emit Withdrawal(to, amount);
    }

    /**
     * @notice Emergency migration after threat level elevates or breaches.
     * Can only be triggered if owner had registered an Ark commitment beforehand.
     */
    function emergencyMigrate(address newOwner, bytes calldata pqPublicKey) external {
        require(ark.hasValidCommitment(owner), "AxionVault: no valid pre-moment ark commitment");
        
        // Verify that provided PQ public key matches committed hash
        (bytes32 committed, , ) = ark.records(owner);
        require(keccak256(pqPublicKey) == committed, "AxionVault: invalid post-quantum public key");

        address oldOwner = owner;
        owner = newOwner;
        emit EmergencyMigration(oldOwner, newOwner);
    }
}
