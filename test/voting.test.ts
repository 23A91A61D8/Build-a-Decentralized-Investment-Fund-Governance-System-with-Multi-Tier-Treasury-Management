import { expect } from "chai";
import { ethers } from "hardhat";

describe("Voting", function () {
  let dao: any;
  let member1: any;
  let member2: any;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    member1 = signers[1];
    member2 = signers[2];

    const DAO = await ethers.getContractFactory("DAOGovernance");
    dao = await DAO.deploy();
    await dao.waitForDeployment();

    await dao.connect(member1).deposit({ value: ethers.parseEther("100") });
    await dao.connect(member2).deposit({ value: ethers.parseEther("25") });

    const PROPOSER_ROLE = await dao.PROPOSER_ROLE();
    await dao.grantRole(PROPOSER_ROLE, member1.address);

    await dao.connect(member1).propose(
      1,
      member2.address,
      ethers.parseEther("5"),
      "Voting test"
    );

    await ethers.provider.send("evm_mine", []);
  });

  it("Allows voting during active period", async () => {
    await expect(
      dao.connect(member1).castVote(1, 1)
    ).to.emit(dao, "VoteCast");
  });

  it("Prevents double voting", async () => {
    await dao.connect(member1).castVote(1, 1);
    await expect(
      dao.connect(member1).castVote(1, 1)
    ).to.be.reverted;
  });

  it("Rejects voting outside voting window", async () => {
    for (let i = 0; i < 30; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    await expect(
      dao.connect(member2).castVote(1, 1)
    ).to.be.reverted;
  });

  it("Gives higher voting power to larger stake", async () => {
    const power1 = await dao.getVotingPower(member1.address);
    const power2 = await dao.getVotingPower(member2.address);

    expect(power1).to.be.gt(power2);
  });
});
