const { expect } = require("chai");
const { utils } = require('ethers');
const { ethers } = require("hardhat");

describe("VotingContract", function () {

  let votingContract;
  let owner;
  let addr1;
  let addr2;
  let provider;

  const voteName = "FirstVote";

  const firstCandidateName = "Andrey";
  let firstCandidateAddr;

  const secondCandidateName = "Vlad";
  let secondCandidateAddr;

  let ownerAddr;

  let candidateParams;

  let votingStartDate;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    provider = ethers.provider;

    firstCandidateAddr = await addr1.getAddress();
    secondCandidateAddr = await addr2.getAddress();
    ownerAddr = await owner.getAddress();
    votingStartDate = Math.floor(new Date().getTime() / 1000);

    candidateParams = [
      {candidateName: firstCandidateName, candidateAddress: firstCandidateAddr, voteCount: 0},
      {candidateName: secondCandidateName, candidateAddress: secondCandidateAddr, voteCount: 0}
    ];

    const votingContractFactory = await ethers.getContractFactory("VotingContract", owner);
    votingContract = await votingContractFactory.deploy();
    await votingContract.deployed();
  });

  describe("Create voting", function () {
    it("Shoud fail if voting created by not owner", async function () {
      await expect(votingContract.connect(addr1).createVote(voteName, [], votingStartDate)).to.be.revertedWith('Only contractOwner can start and end the voting');
    });

    it("Shoud create voting susscessfully", async function () {
      //act
      await votingContract.connect(owner).createVote(voteName, candidateParams, votingStartDate);
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

  describe("Vote", function () {
    beforeEach(async function () {
      await votingContract.connect(owner).createVote(voteName, candidateParams, votingStartDate);
    });

    it("Shoud fail if voting amount is not equal to 10000000000000000", async function () {
      await expect(votingContract.connect(owner).vote(voteName, firstCandidateAddr)).to.be.revertedWith("Your payment should be equal to 10000000000000000 wei");
    });

    it("Shoud fail if current address already voted", async function () {
      const value = utils.parseEther("0.01");
      await votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: value});

      //assert
      await expect(votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: value})).to.be.revertedWith("You already voted");
    });

    it("Shoud vote susscessfully", async function () {
      //act
      const value = utils.parseEther("0.01");
      await votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: value});

      var votingInfo = await votingContract.getVotingInfo(voteName);
      var candidateInfo = await votingContract.getVotingCandidateInfo(voteName, firstCandidateAddr);
      var voterInfo = await votingContract.getVoterInfo(voteName, ownerAddr);
      
      //assert
      expect(candidateInfo.voteCount).to.equal(1);
      expect(votingInfo.votingBalance).to.equal(value);
      expect(voterInfo.voted).to.equal(true);
    });
  });

  describe("End vote", function () {
    beforeEach(async function () {
    });

    it("Shoud fail if voting state is not InProgress", async function () {
      await expect(votingContract.connect(owner).endVote(voteName)).to.be.revertedWith("It must be in InProgress votingState");
    });

    it("Shoud fail if current date is less than 3 minutes after voting creation", async function () {
      const value = utils.parseEther("0.01");
      await votingContract.connect(owner).createVote(voteName, candidateParams, votingStartDate);
      await votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: value});

      //assert
      await expect(votingContract.connect(owner).endVote(voteName)).to.be.revertedWith("You can end voting only after 3 minutes");
    });

    it("Shoud end vote susscessfully", async function () {
      //arrange
      let date = new Date();
      date.setMinutes(date.getMinutes() - 3);
      let startDate = Math.floor(date.getTime() / 1000);

      let firstCandidateBalance = await provider.getBalance(addr1.address);

      let tx = await votingContract.connect(owner).createVote(voteName, candidateParams, startDate);
      await tx.wait();

      const value = utils.parseEther("0.01");
      tx = await votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: value});
      await tx.wait();

      //act
      tx = await votingContract.connect(owner).endVote(voteName);
      await tx.wait();

      var votingInfo = await votingContract.getVotingInfo(voteName);
      
      //assert
      let winnerBalance = parseInt(await provider.getBalance(votingInfo.winnerAddress));
      let expectedBalance = parseInt(firstCandidateBalance) + parseInt(utils.parseEther("0.009"));
      console.log(winnerBalance);
      console.log(expectedBalance);

      // expect(winnerBalance).to.equal(expectedBalance);
      // expect(votingInfo.winnerAddress).to.equal(firstCandidateAddr);
      // expect(votingInfo.votingBalance).to.equal(value);
      // expect(votingInfo.votingState).to.equal(2);
    });
  });

  describe("Widthdraw", function () {
    beforeEach(async function () {
    });

    it("Shoud fail if is made by not owner", async function () {
      await expect(votingContract.connect(addr1).widthdraw(voteName)).to.be.revertedWith("Only contractOwner can start and end the voting");
    });

    it("Shoud fail if voting stated not Ended", async function () {
      await expect(votingContract.connect(owner).widthdraw(voteName)).to.be.revertedWith("It must be in Ended votingState");
    });

    it("Should fail if widthdraw has already been made", async function () {
      let date = new Date();
      date.setMinutes(date.getMinutes() - 3);
      let startDate = Math.floor(date.getTime() / 1000);

      let tx = await votingContract.connect(owner).createVote(voteName, candidateParams, startDate);
      await tx.wait();

      tx = await votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: utils.parseEther("0.01")});
      await tx.wait();

      tx = await votingContract.connect(owner).endVote(voteName);
      await tx.wait();

      //act
      tx = await votingContract.connect(owner).widthdraw(voteName);
      await tx.wait();

      await expect(votingContract.connect(owner).widthdraw(voteName)).to.be.revertedWith("Withdraw for this voting has already been made");
    });

    it("Should widthdraw susscessfully", async function () { 
      let date = new Date();
      date.setMinutes(date.getMinutes() - 3);
      let startDate = Math.floor(date.getTime() / 1000);

      let contractBalance = await provider.getBalance(votingContract.address);
      console.log('contractBalanceInitial=', parseInt(contractBalance._hex));

      let ownerBalance = await provider.getBalance(owner.address);
      console.log('ownerBalanceInitial=', parseInt(ownerBalance._hex));

      let firstCandidateBalance = await provider.getBalance(addr1.address);
      console.log('firstCandidateInitial=', parseInt(firstCandidateBalance._hex));

      let tx = await votingContract.connect(owner).createVote(voteName, candidateParams, startDate);
      await tx.wait();

      tx = await votingContract.connect(owner).vote(voteName, firstCandidateAddr, {value: utils.parseEther("0.01")});
      await tx.wait();

      tx = await votingContract.connect(owner).endVote(voteName);
      await tx.wait();

      // const gasUsedForWinnerTransfer = tx.getTransactionReceipt().gasUsed;

      //act
      tx = await votingContract.connect(owner).widthdraw(voteName);
      await tx.wait();

      contractBalance = await provider.getBalance(votingContract.address);
      console.log('contractBalanceFinal=', parseInt(contractBalance._hex));

      ownerBalance = await provider.getBalance(owner.address);
      console.log('ownerBalanceFinal=', parseInt(ownerBalance._hex));

      firstCandidateBalance = await provider.getBalance(addr1.address);
      console.log('firstCandidateFinal=', parseInt(firstCandidateBalance._hex));

      // expect(await provider.getBalance(ownerAddr)).to.equal(utils.parseEther("0.001") + ownerInitialBalance);
    });
  });
});
