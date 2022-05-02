const { expect } = require("chai");
const { utils } = require('ethers');
const { ethers } = require("hardhat");

describe("VotingContract", function () {

  let votingContract;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let provider;

  const voteName = "FirstVote";

  const firstCandidateName = "Andrey";
  let firstCandidateAddr;

  const secondCandidateName = "Vlad";
  let secondCandidateAddr;

  let ownerAddr;

  let widthdrawAddr;

  let candidateParams;

  let votingStartDate;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    provider = ethers.provider;

    firstCandidateAddr = await addr1.getAddress();
    secondCandidateAddr = await addr2.getAddress();
    ownerAddr = await owner.getAddress();
    widthdrawAddr = await addr3.getAddress();
    votingStartDate = Math.floor(new Date().getTime() / 1000);

    candidateParams = [firstCandidateAddr, secondCandidateAddr];

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
      expect(candidateInfo.candidateAddress).to.equal(firstCandidateAddr);
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

      //assert
      var votingInfo = await votingContract.getVotingInfo(voteName);
      let winnerBalance = await provider.getBalance(votingInfo.winnerAddress);
      let expectedBalance = firstCandidateBalance.add(utils.parseEther("0.009"));

      expect(winnerBalance).to.equal(expectedBalance);
      expect(votingInfo.winnerAddress).to.equal(firstCandidateAddr);
      expect(votingInfo.votingBalance).to.equal(value);
      expect(votingInfo.votingState).to.equal(2);
    });
  });

  describe("Widthdraw", function () {
    beforeEach(async function () {
    });

    it("Shoud fail if is made by not owner", async function () {
      await expect(votingContract.connect(addr1).widthdraw(voteName, widthdrawAddr)).to.be.revertedWith("Only contractOwner can start and end the voting");
    });

    it("Shoud fail if voting stated not Ended", async function () {
      await expect(votingContract.connect(owner).widthdraw(voteName, widthdrawAddr)).to.be.revertedWith("It must be in Ended votingState");
    });

    it("Should fail if widthdraw has already been made", async function () {
      //arrange
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
      tx = await votingContract.connect(owner).widthdraw(voteName, widthdrawAddr);
      await tx.wait();

      //assert
      await expect(votingContract.connect(owner).widthdraw(voteName, widthdrawAddr)).to.be.revertedWith("Withdraw for this voting has already been made");
    });

    it("Should widthdraw susscessfully", async function () { 
      //arrange
      let date = new Date();
      date.setMinutes(date.getMinutes() - 3);
      let startDate = Math.floor(date.getTime() / 1000);

      let voterAddress = addr2;

      let tx = await votingContract.connect(owner).createVote(voteName, candidateParams, startDate);
      let receipt = await tx.wait();
      var createVoteTxPrice = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

      tx = await votingContract.connect(voterAddress).vote(voteName, firstCandidateAddr, {value: utils.parseEther("0.01")});
      receipt = await tx.wait();
      var voteTxPrice = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

      tx = await votingContract.connect(owner).endVote(voteName);
      receipt = await tx.wait();
      var endVoteTxPrice = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

      let widthdrawBalanceBeforeWidthdraw = await provider.getBalance(widthdrawAddr);

      //act
      tx = await votingContract.connect(owner).widthdraw(voteName, widthdrawAddr);
      receipt = await tx.wait();
      let widthdrawTxPrice = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

      let widthdrawBalanceAfterWidthdraw = await provider.getBalance(widthdrawAddr);
      let widthdrawRevenue = widthdrawBalanceAfterWidthdraw.sub(widthdrawBalanceBeforeWidthdraw);

      //assert
      expect(widthdrawRevenue).to.equal(utils.parseEther("0.001"));
    });
  });
});
