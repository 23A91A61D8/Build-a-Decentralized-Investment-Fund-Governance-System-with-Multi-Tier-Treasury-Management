import { expect } from "chai";
import { ethers } from "hardhat";

describe("Governance – Proposal Lifecycle", function () {
  let dao: any;
  let deployer: any, member1: any, member2: any;

  beforeEach(async () => {
    [deployer, member1, member2] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAOGovernance");
    dao = await DAO.deploy();
    await dao.waitForDeployment();

    // Deposit ETH
    await dao.connect(member1).deposit({ value: ethers.parseEther("10") });
    await dao.connect(member2).deposit({ value: ethers.parseEther("5") });

    // Grant proposer role
    const PROPOSER_ROLE = await dao.PROPOSER_ROLE();
    await dao.grantRole(PROPOSER_ROLE, member1.address);
  });

  it("Allows proposal creation with sufficient stake", async () => {
    await expect(
      dao.connect(member1).propose(
        0,
        member2.address,
        ethers.parseEther("1"),
        "Test proposal"
      )
    ).to.emit(dao, "ProposalCreated");
  });

  it("Rejects proposal from non-proposer", async () => {
    await expect(
      dao.connect(member2).propose(
        0,
        member1.address,
        ethers.parseEther("1"),
        "Should fail"
      )
    ).to.be.reverted;
  });

  it("Moves proposal through Pending → Active → Defeated", async () => {
    await dao.connect(member1).propose(
      0,
      member2.address,
      ethers.parseEther("1"),
      "Lifecycle test"
    );

    expect(await dao.getProposalState(1)).to.equal(0); // Pending

    await ethers.provider.send("evm_mine", []);
    expect(await dao.getProposalState(1)).to.equal(1); // Active

    for (let i = 0; i < 30; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    expect(await dao.getProposalState(1)).to.equal(2); // Defeated
  });
});
