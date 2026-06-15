import fs from "fs";
import { ethers } from "ethers";
import "dotenv/config";

async function main() {
    // 1. Load the compiled artifacts
    const abi = JSON.parse(fs.readFileSync("./build/GaslessTokenTransfer.abi", "utf8"));
    const bytecode = fs.readFileSync("./build/GaslessTokenTransfer.bin", "utf8");

    // 2. Connect to the network (defaults to local node)
    const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/zJse7jcREWmgwhOAFSz9j");

    // 3. Set up wallet securely
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("Please set your PRIVATE_KEY in a .env file");
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Deploying contract with account: ${wallet.address}`);

    // 4. Trigger deployment
    console.log("Sending deployment transaction...");
    const Factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await Factory.deploy();

    // 5. Wait for confirmation
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n🚀 Success!");
    console.log(`GaslessTokenTransfer deployed to: ${contractAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
