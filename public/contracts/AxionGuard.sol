// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AxionOracle.sol";

/**
 * @title AxionGuard
 * @notice Inherited by smart contracts, DeFi vaults, or DAO treasuries.
 * Automatically halts protected functions if the quantum threat level
 * reaches or exceeds the configured safety threshold.
 */
abstract contract AxionGuard {
    IAxionOracle public immutable axionOracle;
    IAxionOracle.ThreatLevel public immutable tripThreshold;

    event GuardTripped(IAxionOracle.ThreatLevel currentLevel, uint256 timestamp);

    error QuantumThreatTripped(IAxionOracle.ThreatLevel currentLevel, IAxionOracle.ThreatLevel threshold);

    /**
     * @param _oracle Address of the deployed AxionOracle contract.
     * @param _threshold Threat level at or above which functions revert (typically WATCH or ELEVATED).
     */
    constructor(IAxionOracle _oracle, IAxionOracle.ThreatLevel _threshold) {
        require(address(_oracle) != address(0), "AxionGuard: zero address oracle");
        axionOracle = _oracle;
        tripThreshold = _threshold;
    }

    /**
     * @notice Reverts if current threat level >= tripThreshold.
     */
    modifier quantumSafe() {
        IAxionOracle.ThreatLevel current = axionOracle.threatLevel();
        if (current >= tripThreshold) {
            emit GuardTripped(current, block.timestamp);
            revert QuantumThreatTripped(current, tripThreshold);
        }
        _;
    }

    /**
     * @notice Returns true if the contract is currently operating in safe conditions.
     */
    function isOperationAllowed() public view returns (bool) {
        return axionOracle.threatLevel() < tripThreshold;
    }
}
