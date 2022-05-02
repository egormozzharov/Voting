require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require('dotenv').config();
const { API_URL, PRIVATE_KEY, DEPLOYED_CONTRACT_ADDRESS, OWNER_ADDRESS, WIDTHDRAW_ADDRESS } = process.env;

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("createVote", "Create vote", async (taskArgs, hre) => {
  const owner = OWNER_ADDRESS;
  const VotingContractFactory = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContractFactory.attach(DEPLOYED_CONTRACT_ADDRESS);
  const voteName = "FirstVote";
  const candidateParams = ["0x4F745f87488A3d5fb7309892F8CEcCeb97a65610", "0xc0F67917f5dD5a7B60cfca80Cdd25CaEf61452d0"];
  const votingStartDate = Math.floor(new Date().getTime() / 1000);
  await votingContract.connect(owner).createVote(voteName, candidateParams, votingStartDate);
});

task("vote", "Vote", async (taskArgs, hre) => {
  const owner = OWNER_ADDRESS;
  const VotingContractFactory = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContractFactory.attach(DEPLOYED_CONTRACT_ADDRESS);
  const voteName = "FirstVote";
  const candidateAddress = "0x4F745f87488A3d5fb7309892F8CEcCeb97a65610";
  await votingContract.connect(owner).vote(voteName, candidateAddress);
});

task("endVote", "End vote", async (taskArgs, hre) => {
  const owner = OWNER_ADDRESS;
  const VotingContractFactory = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContractFactory.attach(DEPLOYED_CONTRACT_ADDRESS);
  const voteName = "FirstVote";

  await votingContract.connect(owner).endVote(voteName);
});

task("widthdraw", "End vote", async (taskArgs, hre) => {
  const owner = OWNER_ADDRESS;
  const VotingContractFactory = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContractFactory.attach(DEPLOYED_CONTRACT_ADDRESS);
  const voteName = "FirstVote";
  const widthdrawAddr = WIDTHDRAW_ADDRESS;

  await votingContract.connect(owner).widthdraw(voteName, widthdrawAddr);
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.13",
  defaultNetwork: "hardhat",
  networks: {
    rinkeby: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  }
};
