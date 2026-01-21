# CryptoVentures DAO – Decentralized Investment Fund Governance System

## Overview

CryptoVentures DAO is a production-grade on-chain governance system for a decentralized investment fund.  
It enables ETH-backed members to collectively manage treasury allocations and investment decisions using a secure, transparent, and time-locked governance process.

This project is inspired by real-world DAO governance systems such as Compound, Aave, and MakerDAO.

---

## Key Features

### Governance & Voting
- Stake-based governance using weighted (square-root) voting
- Prevents whale dominance while rewarding higher stake
- Vote types: For, Against, Abstain
- One vote per proposal per member

### Delegation
- Members can delegate voting power to trusted representatives
- Delegated voting power is automatically counted
- Prevents double voting and delegation abuse

### Proposal Lifecycle
Pending → Active → Defeated / Queued → Executed / Canceled

- Strict state transition enforcement
- Voting windows enforced by block numbers
- Handles zero-vote, tie, and expired proposals safely

### Timelock Security
- Approved proposals are queued before execution
- Configurable timelock per proposal type
- Execution grace period enforced
- Guardian role can cancel malicious proposals

### Multi-Tier Treasury Management

| Proposal Type     | Allocation | Approval | Quorum | Timelock |
|------------------|------------|----------|--------|----------|
| High Conviction  | 60%        | 60%      | 40%    | 7 days   |
| Experimental     | 30%        | 50%      | 25%    | 3 days   |
| Operational      | 10%        | 50%      | 15%    | 1 day    |

- Prevents overspending
- Faster approvals for small operational expenses
- Graceful failure on insufficient funds

### Role-Based Access Control
- PROPOSER_ROLE – create proposals
- EXECUTOR_ROLE – execute queued proposals
- GUARDIAN_ROLE – cancel proposals in emergencies
- DEFAULT_ADMIN_ROLE – manage roles

---

## Architecture

### Project Structure
contracts/
├── governance/
│ ├── DAOGovernance.sol
│ ├── VotingPowerCalculator.sol
│ └── Timelock.sol
├── treasury/
│ └── Treasury.sol
├── access/
│ └── AccessControl.sol
└── interfaces/
├── IGovernance.sol
└── ITreasury.sol

scripts/
├── deploy.ts
└── seed-state.ts

test/
├── governance.test.ts
├── voting.test.ts
├── timelock.test.ts
└── treasury.test.ts

### Design Principles
- Separation of concerns
- Checks-Effects-Interactions pattern
- Gas-efficient state updates
- No unbounded loops
- On-chain transparency

---

## Weighted Voting Mechanism

Voting power is calculated using square-root weighting:
Voting Power = √(ETH Staked)

Example:
- 100 ETH → 10 votes
- 400 ETH → 20 votes

This reduces plutocracy while maintaining stake-based influence.

---


