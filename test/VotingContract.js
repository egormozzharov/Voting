const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingContract", function () {

  let votingContract;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const votingContractFactory = await ethers.getContractFactory("VotingContract", owner);
    votingContract = await votingContractFactory.deploy();
    await votingContract.deployed();
  });

  describe("Create voting", function () {
		it("Shoud fail if voting created by", async function () {
      const voteName = "FirstVote";
      await expect(votingContract.connect(addr1).createVote(voteName, [])).to.be.revertedWith('Only contractOwner can start and end the voting');
    });

    it("Shoud create voting susscessfully", async function () {
      const voteName = "FirstVote";

      var candidateParams = [
        {candidateName: "Andrey", candidateAddress: await addr1.getAddress(), voteCount: 0},
        {candidateName: "Vlad", candidateAddress: await addr2.getAddress(), voteCount: 0}
      ];

      const createVoteTx = await votingContract.connect(owner).createVote(voteName, candidateParams);
      await createVoteTx.wait();

      var votingInfo = await votingContract.getVotingInfo(voteName);
      expect(votingInfo.votingState).to.equal(1);
    });
  });
});
