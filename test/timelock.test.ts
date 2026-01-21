import { expect } from "chai";
import { ethers } from "hardhat";

describe("Timelock", function () {
  let dao: any;
  let deployer: any, member1: any;

  beforeEach(async () => {
    [deployer, member1] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAOGovernance");
    dao = await DAO.deploy();
    await dao.waitForDeployment();

    await dao.connect(member1).deposit({ value: ethers.parseEther("100") });

    const PROPOSER_ROLE = await dao.PROPOSER_ROLE();
    await dao.grantRole(PROPOSER_ROLE, member1.address);

    await dao.connect(member1).propose(
      0,
      member1.address,
      ethers.parseEther("5"),
      "Timelock test"
    );

    await ethers.provider.send("evm_mine", []);
    await dao.connect(member1).castVote(1, 1);

    for (let i = 0; i < 30; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    await dao.queue(1);
  });

  it("Prevents execution before timelock", async () => {
    await expect(
      dao.execute(1)
    ).to.be.reverted;
  });

  it("Allows execution after timelock", async () => {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expect(dao.execute(1))
      .to.emit(dao, "ProposalExecuted");
  });

  it("Guardian can cancel proposal", async () => {
    await expect(
      dao.cancel(1)
    ).to.emit(dao, "ProposalCanceled");
  });
});
