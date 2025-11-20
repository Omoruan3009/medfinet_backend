// contracts/compile.js
const { exec } = require('child_process');
const path = require('path');

console.log('Compiling Algorand smart contracts...');

exec('python contracts/campaign_escrow.py', (error, stdout, stderr) => {
  if (error) {
    console.error(`Compilation error: ${error}`);
    return;
  }
  console.log('Smart contracts compiled successfully!');
  console.log('Generated: campaign_escrow_approval.teal');
  console.log('Generated: campaign_escrow_clear.teal');
});