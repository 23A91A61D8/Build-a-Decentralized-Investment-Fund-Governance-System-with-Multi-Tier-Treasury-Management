// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VotingPowerCalculator
 * @author Lakshmi
 * @notice Calculates weighted voting power to reduce whale dominance
 *
 * Voting Strategy:
 * - Square-root weighting (quadratic-style)
 * - votingPower = sqrt(stakeAmount)
 *
 * Example:
 * - 100 ETH  -> 10 votes
 * - 400 ETH  -> 20 votes (NOT 40)
 */
library VotingPowerCalculator {

    /**
     * @notice Calculate voting power from stake amount
     * @param stakeAmount Amount of ETH staked (in wei)
     * @return votingPower Weighted voting power
     */
    function calculateVotingPower(
        uint256 stakeAmount
    ) internal pure returns (uint256 votingPower) {
        if (stakeAmount == 0) {
            return 0;
        }
        return _sqrt(stakeAmount);
    }

    /**
     * @notice Integer square root using Babylonian method
     * @dev Gas-efficient and safe for uint256
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
