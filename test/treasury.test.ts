import { expect } from "chai";
import { ethers } from "hardhat";

describe("Treasury", function () {
  let dao: any;
  let member1: any;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    member1 = signers[1];

    const DAO = await ethers.getContractFactory("DAOGovernance");
    dao = await DAO.deploy();
    await dao.waitForDeployment();

    await dao.connect(member1).deposit({ value: ethers.parseEther("100") });

    const PROPOSER_ROLE = await dao.PROPOSER_ROLE();
    await dao.grantRole(PROPOSER_ROLE, member1.address);
  });

  it("Rejects proposal exceeding treasury allocation", async () => {
    await expect(
      dao.connect(member1).propose(
        0,
        member1.address,
        ethers.parseEther("80"),
        "Too much"
      )
    ).to.be.reverted;
  });

  it("Allows fund transfer on execution", async () => {
    await dao.connect(member1).propose(
      2,
      member1.address,
      ethers.parseEther("5"),
      "Operational expense"
    );

    await ethers.provider.send("evm_mine", []);
    await dao.connect(member1).castVote(1, 1);

    for (let i = 0; i < 30; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    await dao.queue(1);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expect(dao.execute(1))
      .to.emit(dao, "ProposalExecuted");
  });
});
