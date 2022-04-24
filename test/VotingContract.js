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
    it("Shoud fail if voting created by not owner", async function () {
      const voteName = "FirstVote";
      await expect(votingContract.connect(addr1).createVote(voteName, [])).to.be.revertedWith('Only contractOwner can start and end the voting');
    });

    it("Shoud create voting susscessfully", async function () {
      //arrange
      const voteName = "FirstVote";

      const firstCandidateName = "Andrey";
      const firstCandidateAddr = await addr1.getAddress();

      const secondCandidateName = "Vlad";
      const secondCandidateAddr = await addr2.getAddress();

      var candidateParams = [
        {candidateName: firstCandidateName, candidateAddress: firstCandidateAddr, voteCount: 0},
        {candidateName: secondCandidateName, candidateAddress: secondCandidateAddr, voteCount: 0}
      ];

      //act
      const createVoteTx = await votingContract.connect(owner).createVote(voteName, candidateParams);
      await createVoteTx.wait();

      var votingInfo = await votingContract.getVotingInfo(voteName);
      var candidateInfo = await votingContract.getVotingCandidateInfo(voteName, firstCandidateAddr);

      //assert
      expect(votingInfo.votingState).to.equal(1);
      expect(votingInfo.votingBalance).to.equal(0);
      expect(votingInfo.withDrawOccured).to.equal(false);
      expect(candidateInfo.candidateName).to.equal(firstCandidateName);
      expect(candidateInfo.voteCount).to.equal(0);
    });
  });
});
