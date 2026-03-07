require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const THIRDWEB_SECRET_KEY = process.env.THIRD_WEB_SECRET_KEY;

// ===== CONFIGURE THESE VALUES =====
const CHAIN_ID = "84532"; // Base Sepolia testnet
const SERVER_WALLET_ADDRESS = process.env.THIRDWEB_SERVER_WALLET || "0xYOUR_SERVER_WALLET_ADDRESS";
const CONTRACT_ADDRESS = process.env.THIRDWEB_CONTRACT_ADDRESS || "0xYOUR_CONTRACT_ADDRESS";
const MINT_TO_ADDRESS = process.env.THIRDWEB_MINT_TO_ADDRESS || "0xRECIPIENT_ADDRESS";
const MINT_AMOUNT = "100";
// ==================================

// ABI-encode mintTo(address,uint256) call
function encodeMintTo(toAddress, amount) {
  // Function selector: keccak256("mintTo(address,uint256)") = 0x449a52f8
  const selector = "449a52f8";
  // Pad address to 32 bytes (remove 0x prefix, left-pad with zeros)
  const paddedAddress = toAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  // Pad uint256 amount to 32 bytes (convert to hex, left-pad with zeros)
  const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
  return "0x" + selector + paddedAddress + paddedAmount;
}

async function testTransaction() {
  if (!THIRDWEB_SECRET_KEY || THIRDWEB_SECRET_KEY === "your_thirdweb_api_key_here") {
    console.error("❌ THIRD_WEB_SECRET_KEY is not set in .env");
    process.exit(1);
  }

  if (SERVER_WALLET_ADDRESS.startsWith("0xYOUR") || CONTRACT_ADDRESS.startsWith("0xYOUR")) {
    console.error("❌ Please set your wallet and contract addresses in this script or in .env:");
    console.error("   THIRDWEB_SERVER_WALLET, THIRDWEB_CONTRACT_ADDRESS, THIRDWEB_MINT_TO_ADDRESS");
    process.exit(1);
  }

  const calldata = encodeMintTo(MINT_TO_ADDRESS, MINT_AMOUNT);

  console.log("🔗 Chain ID:", CHAIN_ID);
  console.log("📤 From (server wallet):", SERVER_WALLET_ADDRESS);
  console.log("📜 Contract:", CONTRACT_ADDRESS);
  console.log("📬 Mint to:", MINT_TO_ADDRESS);
  console.log("💰 Amount:", MINT_AMOUNT);
  console.log("📦 Calldata:", calldata);
  console.log("---");
  console.log("Sending transaction...\n");

  try {
    const response = await fetch("https://api.thirdweb.com/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": THIRDWEB_SECRET_KEY,
      },
      body: JSON.stringify({
        chainId: CHAIN_ID,
        from: SERVER_WALLET_ADDRESS,
        transactions: [
          {
            to: CONTRACT_ADDRESS,
            data: calldata,
            value: "0",
          },
        ],
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Transaction submitted successfully!");
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.error("❌ Transaction failed with status:", response.status);
      console.error("Error:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Request error:", error.message);
  }
}

testTransaction();