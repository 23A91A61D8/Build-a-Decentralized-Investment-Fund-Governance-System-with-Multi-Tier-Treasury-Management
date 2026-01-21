// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VotingPowerCalculator.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DAOGovernance is AccessControl {

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant VOTING_DELAY = 1;
    uint256 public constant VOTING_PERIOD = 20;
    uint256 public constant MIN_PROPOSAL_POWER = 1e18;
    uint256 public constant GRACE_PERIOD = 14 days;

    enum ProposalType { HighConviction, Experimental, Operational }
    enum ProposalState { Pending, Active, Defeated, Queued, Executed, Canceled }

    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        address recipient;
        uint256 amount;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        ProposalState state;
        uint256 eta;
    }

    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint256 votes;
    }

    struct MemberStake {
        uint256 amount;
        uint256 delegatedPower;
    }

    struct TreasuryAllocation {
        uint256 totalAllocated;
        uint256 spent;
        uint256 approvalThreshold;
        uint256 quorumThreshold;
        uint256 timelockDuration;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Receipt)) public receipts;
    mapping(address => MemberStake) public memberStakes;
    mapping(ProposalType => TreasuryAllocation) public allocations;

    uint256 public proposalCount;

    event ProposalCreated(uint256 indexed id, address indexed proposer, ProposalType pType, uint256 amount);
    event VoteCast(uint256 indexed id, address indexed voter, uint8 support, uint256 weight);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    /* ---------------- TREASURY ---------------- */

    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        memberStakes[msg.sender].amount += msg.value;
        _initializeAllocations();
        if (getVotingPower(msg.sender) >= MIN_PROPOSAL_POWER) {
            _grantRole(PROPOSER_ROLE, msg.sender);
        }
    }

    function _initializeAllocations() internal {
        uint256 total = address(this).balance;

        allocations[ProposalType.HighConviction] = TreasuryAllocation(
            (total * 60) / 100, 0, 60, 40, 7 days
        );

        allocations[ProposalType.Experimental] = TreasuryAllocation(
            (total * 30) / 100, 0, 50, 25, 3 days
        );

        allocations[ProposalType.Operational] = TreasuryAllocation(
            (total * 10) / 100, 0, 50, 15, 1 days
        );
    }

    function getVotingPower(address user) public view returns (uint256) {
        return VotingPowerCalculator.calculateVotingPower(
            memberStakes[user].amount
        );
    }

    /* ---------------- PROPOSALS ---------------- */

    function propose(
        ProposalType pType,
        address recipient,
        uint256 amount,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (uint256 id) {

        require(amount <= allocations[pType].totalAllocated - allocations[pType].spent, "Treasury exceeded");

        proposalCount++;
        id = proposalCount;

        proposals[id] = Proposal({
            id: id,
            proposer: msg.sender,
            proposalType: pType,
            recipient: recipient,
            amount: amount,
            description: description,
            startBlock: block.number + VOTING_DELAY,
            endBlock: block.number + VOTING_DELAY + VOTING_PERIOD,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            state: ProposalState.Pending,
            eta: 0
        });

        emit ProposalCreated(id, msg.sender, pType, amount);
    }

    /* ---------------- VOTING ---------------- */

    function castVote(uint256 id, uint8 support) external {
        require(getProposalState(id) == ProposalState.Active, "Not active");
        require(!receipts[id][msg.sender].hasVoted, "Already voted");

        uint256 power = getVotingPower(msg.sender);
        require(power > 0, "No power");

        receipts[id][msg.sender] = Receipt(true, support, power);

        if (support == 1) proposals[id].forVotes += power;
        else if (support == 0) proposals[id].againstVotes += power;
        else proposals[id].abstainVotes += power;

        emit VoteCast(id, msg.sender, support, power);
    }

    /* ---------------- TIMELOCK ---------------- */

    function queue(uint256 id) external {
        require(getProposalState(id) == ProposalState.Queued, "Not passed");

        Proposal storage p = proposals[id];
        p.state = ProposalState.Queued;
        p.eta = block.timestamp + allocations[p.proposalType].timelockDuration;

        emit ProposalQueued(id, p.eta);
    }

    function execute(uint256 id) external onlyRole(EXECUTOR_ROLE) {
        Proposal storage p = proposals[id];

        require(p.state == ProposalState.Queued, "Not queued");
        require(block.timestamp >= p.eta, "Timelock");
        require(block.timestamp <= p.eta + GRACE_PERIOD, "Expired");

        p.state = ProposalState.Executed;
        allocations[p.proposalType].spent += p.amount;

        (bool ok,) = p.recipient.call{value: p.amount}("");
        require(ok, "Transfer failed");

        emit ProposalExecuted(id);
    }

    function cancel(uint256 id) external onlyRole(GUARDIAN_ROLE) {
        proposals[id].state = ProposalState.Canceled;
        emit ProposalCanceled(id);
    }

    /* ---------------- STATE ---------------- */

    function getProposalState(uint256 id) public view returns (ProposalState) {
        Proposal storage p = proposals[id];

        if (p.state == ProposalState.Executed || p.state == ProposalState.Canceled) {
            return p.state;
        }

        if (block.number < p.startBlock) return ProposalState.Pending;
        if (block.number <= p.endBlock) return ProposalState.Active;

        uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
        if (totalVotes == 0) return ProposalState.Defeated;

        uint256 approval = (p.forVotes * 100) / (p.forVotes + p.againstVotes);
        if (approval < allocations[p.proposalType].approvalThreshold) {
            return ProposalState.Defeated;
        }

        if (p.eta == 0) return ProposalState.Queued;

        return p.state;
    }
}
