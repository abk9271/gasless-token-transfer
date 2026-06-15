# Gasless ERC-20 Token Transfer System (EIP-2612)

A production-ready implementation of a gasless token transfer system utilizing **EIP-2612 Permit architecture** on the Ethereum Virtual Machine (EVM). This system allows users with **0 native ETH** to securely sign off-chain transfer intents, which are broadcasted and paid for by a third-party backend Relayer.

---

## 🛠️ System Architecture & Workflow

The architecture shifts the economic burden of gas from the end-user to a Relayer, while maintaining strict non-custodial cryptographic security.

1. **Off-Chain Intent (User):** Alice wants to send tokens but has 0 ETH. She cryptographically signs an EIP-712 structured data permit block authorizing the transfer.
2. **The Relay (Backend):** A Relayer script intercepts the off-chain signature, wraps it into an active EVM transaction, and broadcasts it to the network while paying the native gas fee.
3. **On-Chain Execution & Settlement:** The custom smart contract decodes the signature natively via `ecrecover`. If the cryptographic signature matches the owner, it alters token allowances, transfers the funds to the destination, and transfers a micro-token fee back to the Relayer to reimburse gas costs.

---

## 🏗️ Technical Highlights

* **EIP-2612 Compliance:** Native integration of secp256k1 signature validation (`v`, `r`, `s`) inside the ERC-20 token layer to modify allowances without manual on-chain `approve()` calls.
* **EIP-712 Structured Data:** Standardized hashing and signing domain separators to prevent replay attacks across multiple chains.
* **Custom Vanilla JavaScript Testing Pipeline:** Developed using pure `ethers.js` to bypass native compilation bugs on mobile environments.

---

## 🛑 Engineering Overcomes: Mobile Environment Constraints

During development within a mobile Linux emulation environment (**Termux on Android ARM64**), the project ran into significant cross-compilation boundaries. High-level frameworks like Hardhat threw native binary crashes (`MODULE_NOT_FOUND` / `ERR_DLOPEN_FAILED`) due to the absence of pre-compiled binaries for the architecture.

**The Solution:**
* Eliminated heavy framework reliance entirely.
* Utilized native upstream `solc` binaries directly on the CLI to output raw ABI and bytecode compilation targets.
* Formulated custom execution wrappers to bridge contract state adjustments smoothly on the live Sepolia testnet.

---

## 🚀 How to Run Locally

### 1. Clone the repository
```bash
git clone [https://github.com/abk9271/gasless-token-transfer.git](https://github.com/abk9271/gasless-token-transfer.git)
cd gasless-token-transfer


### 2. Install Project Dependencies
```bash
npm install

### 3. Set Up Environment Secrets
```bash
PRIVATE_KEY="your_relayer_sepolia_private_key_with_test_eth"
ALICE_PRIVATE_KEY="your_sender_sepolia_private_key_with_zero_eth"

### 4. Execute the End-to-End Simulation Pipeline
```bash
node test-gasless.mjs
