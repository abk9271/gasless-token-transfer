import fs from "fs";
import { ethers } from "ethers";
import "dotenv/config";

async function main() {
    // Connect directly to the public Sepolia RPC endpoint
    const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/zJse7jcREWmgwhOAFSz9j");

    // 1. Initialize our live Sepolia actors from your .env file
    const relayerPrivateKey = process.env.PRIVATE_KEY;
    const alicePrivateKey = process.env.ALICE_PRIVATE_KEY;

    if (!relayerPrivateKey || !alicePrivateKey) {
        throw new Error("Please set both PRIVATE_KEY and ALICE_PRIVATE_KEY in your .env file");
    }

    const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);
    const aliceWallet = new ethers.Wallet(alicePrivateKey, provider);
    
    // Bob's address transformed into a perfectly valid EIP-55 Checksum address
    const bobAddress = ethers.getAddress("0x0000000000000000000000000000000000000001"); 

    console.log("--------------------------------------------------");
    console.log(`Relayer Address: ${relayerWallet.address}`);
    console.log(`Alice (Sender) Address: ${aliceWallet.address}`);
    console.log(`Bob (Receiver) Address: ${bobAddress}`);
    console.log("--------------------------------------------------");

    // 2. Load ABIs and Bytecodes
    const tokenAbi = JSON.parse(fs.readFileSync("./build/PermitToken.abi", "utf8"));
    const tokenBytecode = fs.readFileSync("./build/PermitToken.bin", "utf8");
    const gaslessAbi = JSON.parse(fs.readFileSync("./build/GaslessTokenTransfer.abi", "utf8"));
    
    // Your deployed GaslessTokenTransfer contract address on Sepolia
    const gaslessContractAddress = ethers.getAddress("0xf5d09227617A3225b1CF316c8d9f99931c76E0bB"); 
    const gaslessContract = new ethers.Contract(gaslessContractAddress, gaslessAbi, relayerWallet);

    // 3. Deploy the Permit Token to Sepolia
    console.log("Deploying PermitToken to Sepolia network...");
    const TokenFactory = new ethers.ContractFactory(tokenAbi, tokenBytecode, relayerWallet);
    const tokenContract = await TokenFactory.deploy();
    await tokenContract.waitForDeployment();
    const tokenAddress = await tokenContract.getAddress();
    console.log(`🚀 PermitToken successfully deployed at: ${tokenAddress}\n`);

    // 4. Send some initial tokens from the Deployer (Relayer) to Alice
    console.log("Transferring initial test tokens to Alice...");
    const mintTx = await tokenContract.transfer(aliceWallet.address, ethers.parseEther("100"));
    console.log("Waiting for network confirmation...");
    await mintTx.wait();

    // Check live chain balances
    console.log(`Alice Token Balance: ${ethers.formatEther(await tokenContract.balanceOf(aliceWallet.address))} PGT`);

    // 5. GASLESS PERMIT SIGNING
    console.log("\nGenerating Alice's off-chain cryptographic signature...");
    const amount = ethers.parseEther("10"); // What Bob gets
    const fee = ethers.parseEther("1");    // What the Relayer gets as a reward
    const totalValue = amount + fee;       // Total allowance allocation
    
    const network = await provider.getNetwork();
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiration window
    const nonce = await tokenContract.nonces(aliceWallet.address);

    const domain = {
        name: "Permit Gasless Token",
        version: "1",
        chainId: network.chainId,
        verifyingContract: tokenAddress
    };

    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    const valueHash = {
        owner: aliceWallet.address,
        spender: gaslessContractAddress,
        value: totalValue,
        nonce: Number(nonce),
        deadline: deadline
    };

    // Alice signs the data block completely off-chain (0 gas cost)
    const signature = await aliceWallet.signTypedData(domain, types, valueHash);
    const sig = ethers.Signature.from(signature);
    console.log("🔑 Digital Signature generated successfully!");

    // 6. Relayer broadcasts everything to Sepolia, footing the gas fee bill
    console.log("\nRelayer broadcasting gasless transfer transaction to Sepolia...");
    const tx = await gaslessContract.send(
        tokenAddress,
        aliceWallet.address,
        bobAddress,
        amount,
        fee,
        deadline,
        sig.v,
        sig.r,
        sig.s
    );
    
    console.log(`Transaction broadcasted! Hash: ${tx.hash}`);
    console.log("Waiting for block inclusion mining...");
    await tx.wait();
    console.log("🎉 Transaction successfully mined on Sepolia!");

    // 7. Read altered states
    console.log("\n--- Final Sepolia Balances ---");
    console.log(`Alice Balance: ${ethers.formatEther(await tokenContract.balanceOf(aliceWallet.address))} PGT`);
    console.log(`Bob Balance:   ${ethers.formatEther(await tokenContract.balanceOf(bobAddress))} PGT`);
    console.log(`Relayer Balance: ${ethers.formatEther(await tokenContract.balanceOf(relayerWallet.address))} PGT`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
