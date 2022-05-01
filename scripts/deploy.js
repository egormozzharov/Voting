const { ethers } = require("hardhat");

async function main() {
  const VotingContractFactory = await ethers.getContractFactory("VotingContract");
   const contract = await VotingContractFactory.deploy();
   await contract.deployed();
   console.log("Contract deployed to address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });