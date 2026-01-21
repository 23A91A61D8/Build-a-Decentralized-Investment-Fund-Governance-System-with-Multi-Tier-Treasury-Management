import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting DAO deployment & seeding...\n");

  // ------------------------------------------------------------
  // 1️⃣ Get signers
  // ------------------------------------------------------------
  const [
    deployer,
    member1,
    member2,
    member3,
    member4,
    member5,
  ] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  // ------------------------------------------------------------
  // 2️⃣ Deploy DAO Governance contract
  // ------------------------------------------------------------
  const DAOGovernance = await ethers.getContractFactory("DAOGovernance");
  const governance = await DAOGovernance.deploy();
  await governance.waitForDeployment();

  const governanceAddress = await governance.getAddress();
  console.log("✅ DAOGovernance deployed at:", governanceAddress);

  // ------------------------------------------------------------
  // 3️⃣ Deposit ETH (simulate 1000 ETH treasury)
  // ------------------------------------------------------------
  console.log("\n💰 Seeding member stakes...");

  await governance.connect(member1).deposit({ value: ethers.parseEther("50") });
  await governance.connect(member2).deposit({ value: ethers.parseEther("100") });
  await governance.connect(member3).deposit({ value: ethers.parseEther("200") });
  await governance.connect(member4).deposit({ value: ethers.parseEther("300") });
  await governance.connect(member5).deposit({ value: ethers.parseEther("350") });

  console.log("✅ Total treasury ≈ 1000 ETH");

  // ------------------------------------------------------------
  // 4️⃣ Grant roles
  // ------------------------------------------------------------
  console.log("\n🔐 Granting roles...");

  const PROPOSER_ROLE = await governance.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await governance.EXECUTOR_ROLE();

  await governance.grantRole(PROPOSER_ROLE, member2.address);
  await governance.grantRole(PROPOSER_ROLE, member3.address);
  await governance.grantRole(PROPOSER_ROLE, member4.address);

  await governance.grantRole(EXECUTOR_ROLE, deployer.address);

  console.log("✅ PROPOSER_ROLE & EXECUTOR_ROLE granted");

  // ------------------------------------------------------------
  // 5️⃣ Create proposals
  // ------------------------------------------------------------
  console.log("\n📝 Creating proposals...");

  // Proposal 1 – Operational
  await governance
    .connect(member2)
    .propose(
      2, // Operational
      member1.address,
      ethers.parseEther("5"),
      "Pay for audit tools"
    );

  // Proposal 2 – Experimental
  await governance
    .connect(member3)
    .propose(
      1, // Experimental
      member2.address,
      ethers.parseEther("50"),
      "Experimental DeFi investment"
    );

  // Proposal 3 – High Conviction
  await governance
    .connect(member4)
    .propose(
      0, // HighConviction
      member3.address,
      ethers.parseEther("150"),
      "High conviction Layer-2 investment"
    );

  console.log("✅ Proposals created");

  // ------------------------------------------------------------
  // 6️⃣ Advance blocks to start voting
  // ------------------------------------------------------------
  console.log("\n⏩ Advancing blocks for voting...");

  for (let i = 0; i < 2; i++) {
    await ethers.provider.send("evm_mine", []);
  }

  // ------------------------------------------------------------
  // 7️⃣ Cast votes
  // ------------------------------------------------------------
  console.log("\n🗳️ Casting votes...");

  await governance.connect(member1).castVote(1, 1);
  await governance.connect(member2).castVote(1, 1);

  await governance.connect(member3).castVote(2, 1);
  await governance.connect(member4).castVote(2, 0);

  await governance.connect(member4).castVote(3, 1);
  await governance.connect(member5).castVote(3, 1);

  console.log("✅ Votes cast");

  // ------------------------------------------------------------
  // 8️⃣ Advance blocks to end voting
  // ------------------------------------------------------------
  console.log("\n⏩ Ending voting period...");

  for (let i = 0; i < 25; i++) {
    await ethers.provider.send("evm_mine", []);
  }

  // ------------------------------------------------------------
  // 9️⃣ Queue proposals
  // ------------------------------------------------------------
  console.log("\n⏳ Queueing proposals...");

  await governance.queue(1);
  await governance.queue(3);

  console.log("✅ Proposals queued");

  // ------------------------------------------------------------
  // 🔟 Advance time JUST past timelock
  // ------------------------------------------------------------
  console.log("\n⏰ Advancing time for timelock...");

  // EXACT timelock duration (no extra buffer)
  await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine", []);

  // ------------------------------------------------------------
  // 1️⃣1️⃣ Execute proposal
  // ------------------------------------------------------------
  console.log("\n⚡ Executing proposal 1...");

  await governance.execute(1);

  console.log("✅ Proposal 1 executed");
  console.log("\n🎉 Deployment & seeding COMPLETED SUCCESSFULLY");
}

// ------------------------------------------------------------
// Run script
// ------------------------------------------------------------
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
