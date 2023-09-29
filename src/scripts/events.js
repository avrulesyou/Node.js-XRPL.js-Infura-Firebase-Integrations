const xrpl = require("xrpl")


// In browsers, use a <script> tag. In Node.js, uncomment the following line:
// const xrpl = require('xrpl')

// Wrap code in an async function so we can use await
async function main() {

    // Define the network client
    const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233")
    await client.connect()

    const test_wallet = xrpl.Wallet.fromSeed("sEdSQByqTJ4LcrWZ7kN3Y7hECMYLs9Z") // Test secret; don't use for real

  // Get info from the ledger about the address we just funded
  const response = await client.request({
    "command": "account_info",
    "account": test_wallet.address,
    "ledger_index": "validated"
  })
  console.log(response)
    // ... custom code goes here

    // Listen to ledger close events
  client.request({
    "command": "subscribe",
    "streams": ["ledger"]
  })
  client.on("ledgerClosed", async (ledger) => {
    console.log(`Ledger #${ledger.ledger_index} validated with ${ledger.txn_count} transactions!`)
  })
  
    // Disconnect when done (If you omit this, Node.js won't end the process)
    client.disconnect()
  }
  
  main()