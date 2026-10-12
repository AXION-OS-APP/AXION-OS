// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AxionOracle.sol";

/**
 * @title AxionArk
 * @notice Pre-Moment post-quantum ownership registry.
 * Users commit the keccak256 hash of their ML-DSA-44 post-quantum public key.
 * Only commitments recorded BEFORE the Axion Moment can serve as valid post-quantum recovery roots.
 */
contract AxionArk {
    IAxionOracle public immutable oracle;

    struct KeyRecord {
        bytes32 commitment; // keccak256(pqPublicKey)
        uint256 registeredAt;
        bool exists;
    }

    // Owner Ethereum address => Post-Quantum Key Commitment Record
    mapping(address => KeyRecord) public records;

    event KeyCommitted(address indexed account, bytes32 indexed commitment, uint256 timestamp);

    error PostMomentCommitmentForbidden(uint256 momentTimestamp);

    constructor(IAxionOracle _oracle) {
        oracle = _oracle;
    }

    /**
     * @notice Register a post-quantum public key commitment.
     * @param commitment keccak256 hash of the ML-DSA-44 public key.
     */
    function commitKey(bytes32 commitment) external {
        require(commitment != bytes32(0), "AxionArk: invalid commitment");
        
        uint256 moment = oracle.axionMomentTimestamp();
        if (moment > 0 && block.timestamp >= moment) {
            revert PostMomentCommitmentForbidden(moment);
        }

        records[msg.sender] = KeyRecord({
            commitment: commitment,
            registeredAt: block.timestamp,
            exists: true
        });

        emit KeyCommitted(msg.sender, commitment, block.timestamp);
    }

    /**
     * @notice Checks if an account has a valid pre-Moment commitment.
     */
    function hasValidCommitment(address account) external view returns (bool) {
        if (!records[account].exists) return false;
        uint256 moment = oracle.axionMomentTimestamp();
        if (moment == 0) return true;
        return records[account].registeredAt < moment;
    }
}
