const fs = require("fs");
const path = require("path");
const process = require("process");

const dotenv = require("dotenv");
const { ethers } = require("ethers");

dotenv.config();

const args = process.argv.slice(2);
const config = parseArgs(args);

if (config.help) {
  printHelp();
  process.exit(0);
}

const requiredFields = ["contract", "mintTime", "functionSignature"];
const missing = requiredFields.filter((field) => !config[field]);
if (missing.length > 0) {
  console.error(`Missing required arguments: ${missing.join(", ")}`);
  printHelp();
  process.exit(1);
}

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  console.error("Missing RPC_URL or PRIVATE_KEY in environment variables.");
  process.exit(1);
}

const mintTimestamp = parseMintTime(config.mintTime);
if (!mintTimestamp) {
  console.error("Invalid mint time. Use ISO string or unix timestamp (seconds). ");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

const iface = loadInterface(config.functionSignature, config.abi);
const contract = new ethers.Contract(config.contract, iface, wallet);

const delayMs = Math.max(0, mintTimestamp - Date.now());
console.log(`Scheduled mint at ${new Date(mintTimestamp).toISOString()} (${delayMs} ms from now)`);

setTimeout(async () => {
  try {
    console.log("Executing mint...");
    const overrides = buildOverrides(config);
    const argsToUse = config.args ?? [];
    const tx = await contract[config.functionName](...argsToUse, overrides);
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error("Mint failed:", error);
    process.exitCode = 1;
  }
}, delayMs);

function parseArgs(argv) {
  const result = {
    args: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--help" || item === "-h") {
      result.help = true;
      break;
    }
    if (!item.startsWith("--")) {
      continue;
    }
    const [key, value] = splitArg(item, argv[i + 1]);
    if (value !== undefined && !item.includes("=")) {
      i += 1;
    }
    switch (key) {
      case "--contract":
        result.contract = value;
        break;
      case "--mint-time":
        result.mintTime = value;
        break;
      case "--function":
        result.functionSignature = value;
        result.functionName = value.split("(")[0];
        break;
      case "--args":
        result.args = parseJson(value);
        break;
      case "--value":
        result.value = value;
        break;
      case "--gas-limit":
        result.gasLimit = value;
        break;
      case "--max-fee":
        result.maxFee = value;
        break;
      case "--max-priority-fee":
        result.maxPriorityFee = value;
        break;
      case "--abi":
        result.abi = value;
        break;
      default:
        break;
    }
  }

  if (!result.functionSignature && result.functionName) {
    result.functionSignature = `${result.functionName}()`;
  }

  return result;
}

function splitArg(current, next) {
  if (current.includes("=")) {
    const [key, value] = current.split("=");
    return [key, value];
  }
  return [current, next];
}

function parseJson(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Failed to parse --args JSON. Example: --args '[" +
      "\"1\", \"0xabc...\"]'");
    process.exit(1);
  }
}

function parseMintTime(input) {
  if (!input) {
    return null;
  }
  const asNumber = Number(input);
  if (!Number.isNaN(asNumber)) {
    if (asNumber < 1e12) {
      return asNumber * 1000;
    }
    return asNumber;
  }
  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function loadInterface(signature, abiPath) {
  if (abiPath) {
    const absolute = path.resolve(process.cwd(), abiPath);
    const content = fs.readFileSync(absolute, "utf-8");
    return new ethers.Interface(JSON.parse(content));
  }
  return new ethers.Interface([`function ${signature}`]);
}

function buildOverrides(configInput) {
  const overrides = {};
  if (configInput.value) {
    overrides.value = ethers.parseEther(configInput.value);
  }
  if (configInput.gasLimit) {
    overrides.gasLimit = BigInt(configInput.gasLimit);
  }
  if (configInput.maxFee) {
    overrides.maxFeePerGas = ethers.parseUnits(configInput.maxFee, "gwei");
  }
  if (configInput.maxPriorityFee) {
    overrides.maxPriorityFeePerGas = ethers.parseUnits(configInput.maxPriorityFee, "gwei");
  }
  return overrides;
}

function printHelp() {
  console.log(`Usage: node src/bot.js --contract <address> --mint-time <time> --function <signature> [options]

Required:
  --contract        NFT contract address
  --mint-time       ISO timestamp or unix timestamp (seconds or ms)
  --function        Mint function signature, e.g. mint(uint256)

Options:
  --args            JSON array for function args, e.g. --args '["1", "0xabc"]'
  --value           ETH value to send (in ETH)
  --gas-limit       Gas limit
  --max-fee         Max fee per gas (gwei)
  --max-priority-fee Max priority fee per gas (gwei)
  --abi             Path to ABI JSON file
  -h, --help        Show help

Environment variables:
  RPC_URL, PRIVATE_KEY
`);
}
