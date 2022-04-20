const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingContract", function () {
  it("Should return the new contract once it's changed", async function () {
    const VotingContract = await ethers.getContractFactory("VotingContract");
    const voting = await VotingContract.deploy();
    await voting.deployed();
  });
});
