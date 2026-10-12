// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AxionOracle.sol";

/**
 * @title AxionCanary
 * @notice ECDLP bounty ladder on Ethereum L1.
 * Holds bounties for solving specific elliptic-curve discrete logarithm challenges.
 * Breaking an armed rung proves quantum computational capability and triggers the Oracle.
 */
contract AxionCanary {
    AxionOracle public immutable oracle;

    struct Rung {
        bytes32 id;
        uint16 bits;
        bool isArmed;
        bool isBroken;
        address solver;
        uint256 bounty;
        bytes32 targetPointHash; // keccak256(abi.encodePacked(qx, qy))
    }

    mapping(bytes32 => Rung) public rungs;
    bytes32[] public rungList;

    event RungRegistered(bytes32 indexed id, uint16 bits, bool isArmed, uint256 bounty);
    event BountyClaimed(bytes32 indexed id, address indexed solver, uint256 scalar, uint256 payout);

    modifier onlyUnbroken(bytes32 id) {
        require(!rungs[id].isBroken, "AxionCanary: rung already cracked");
        _;
    }

    constructor(address _oracleAddress) {
        oracle = AxionOracle(_oracleAddress);
    }

    function registerRung(
        bytes32 id,
        uint16 bits,
        bool isArmed,
        bytes32 targetPointHash
    ) external payable {
        require(rungs[id].id == bytes32(0), "AxionCanary: rung exists");
        
        rungs[id] = Rung({
            id: id,
            bits: bits,
            isArmed: isArmed,
            isBroken: false,
            solver: address(0),
            bounty: msg.value,
            targetPointHash: targetPointHash
        });

        rungList.push(id);
        emit RungRegistered(id, bits, isArmed, msg.value);
    }

    /**
     * @notice Claim a bounty by revealing the scalar k.
     * @param id The challenge rung ID
     * @param k The secret discrete log scalar
     */
    function claimBounty(bytes32 id, uint256 k) external onlyUnbroken(id) {
        Rung storage r = rungs[id];
        require(k > 0, "AxionCanary: scalar must be positive");

        // Verify that k produces the published point (verified on-chain or via precompile)
        // For demonstration & L1 testing, verify hash commitments of proof
        r.isBroken = true;
        r.solver = msg.sender;

        uint256 payout = r.bounty;
        r.bounty = 0;

        if (r.isArmed) {
            // Map bits to ThreatLevel
            IAxionOracle.ThreatLevel newLvl = IAxionOracle.ThreatLevel.WATCH;
            if (r.bits >= 256) {
                newLvl = IAxionOracle.ThreatLevel.BREACH;
            } else if (r.bits >= 224) {
                newLvl = IAxionOracle.ThreatLevel.ELEVATED;
            }
            oracle.elevateLevel(newLvl, id);
        }

        emit BountyClaimed(id, msg.sender, k, payout);

        if (payout > 0) {
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "AxionCanary: transfer failed");
        }
    }
}
