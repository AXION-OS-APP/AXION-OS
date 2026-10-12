// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAxionOracle {
    enum ThreatLevel {
        NOMINAL,   // 0: All armed curves intact
        WATCH,     // 1: 192-bit rung broken
        ELEVATED,  // 2: 224-bit rung broken
        CRITICAL,  // 3: 256-bit P-256 broken
        BREACH     // 4: secp256k1 broken (L1 curve compromised)
    }

    event ThreatLevelUpdated(ThreatLevel oldLevel, ThreatLevel newLevel, uint256 timestamp);
    event AxionMomentTriggered(bytes32 indexed curveId, uint256 timestamp);

    function threatLevel() external view returns (ThreatLevel);
    function isQuantumSafe() external view returns (bool);
    function axionMomentTimestamp() external view returns (uint256);
}

contract AxionOracle is IAxionOracle {
    address public immutable canaryContract;
    ThreatLevel private _currentLevel;
    uint256 public override axionMomentTimestamp;

    modifier onlyCanary() {
        require(msg.sender == canaryContract, "AxionOracle: caller is not canary");
        _;
    }

    constructor(address _canary) {
        canaryContract = _canary;
        _currentLevel = ThreatLevel.NOMINAL;
    }

    function threatLevel() external view override returns (ThreatLevel) {
        return _currentLevel;
    }

    function isQuantumSafe() external view override returns (bool) {
        return _currentLevel == ThreatLevel.NOMINAL;
    }

    function elevateLevel(ThreatLevel newLevel, bytes32 curveId) external onlyCanary {
        require(newLevel > _currentLevel, "AxionOracle: level must increase");
        
        if (axionMomentTimestamp == 0 && newLevel > ThreatLevel.NOMINAL) {
            axionMomentTimestamp = block.timestamp;
            emit AxionMomentTriggered(curveId, block.timestamp);
        }

        ThreatLevel oldLevel = _currentLevel;
        _currentLevel = newLevel;
        emit ThreatLevelUpdated(oldLevel, newLevel, block.timestamp);
    }
}
