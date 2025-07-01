const fs = require('fs');
const sharp = require('sharp');
const QRCode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');

const PINATA_JWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0NmNmZmM1MC0zY2NmLTRkNDUtOWJlZS1mZjg0NDkyYzk5ZjciLCJlbWFpbCI6Im9tb3J1YW5sYXVyYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYWRiZjdmNjUzMDA4M2U0MjY5MzIiLCJzY29wZWRLZXlTZWNyZXQiOiI3MjRhYzJkNmU4ZTM4MGE3NjBhMjg3MzZlYzEwNzUxZWRiZDlmZmJjNmI4ZGNkN2FjMDhlMjE1MTg0NzVmZTY1IiwiZXhwIjoxNzgyOTMwMjkxfQ.STE0WMTNYoyttjys4vJHx_Gk91ZGts71PIkb0nuIJlI'; // paste from Pinata dashboard

// async function generateCertificate(data, outputPath = 'cert.png') {
//   const qrData = `https://testnet.explorer.perawallet.app/tx/${data.blockchain_tx}`;
//   const qrCodeBuffer = await QRCode.toBuffer(qrData);

//   const base = sharp({
//     create: {
//       width: 600,
//       height: 400,
//       channels: 3,
//       background: '#ffffff',
//     },
//   });

//   const svgText = `
//     <svg width="600" height="400">
//       <style>
//         .title { fill: #222; font-size: 24px; font-weight: bold; }
//         .label { fill: #444; font-size: 16px; }
//       </style>
//       <text x="30" y="40" class="title">Digital Vaccination Record</text>
//       <text x="30" y="80" class="label">Child ID: ${data.childIdHash}</text>
//       <text x="30" y="110" class="label">Child Name: ${data.childName}</text>
//       <text x="30" y="140" class="label">Child Date of Birth: ${data.childDOB}</text>
//       <text x="30" y="170" class="label">Vaccine: ${data.vaccineId}</text>
//       <text x="30" y="200" class="label">Dose #: ${data.doseNumber}</text>
//       <text x="30" y="230" class="label">Batch #: ${data.batchNumber}</text>
//       <text x="30" y="260" class="label">Date: ${data.dateAdministered}</text>
//       <text x="30" y="290" class="label">Health Worker: ${data.provider}</text>
//       <text x="30" y="320" class="label">Facility: ${data.location}</text>
//     </svg>`;

//   await base
//     .composite([
//       { input: Buffer.from(svgText), top: 0, left: 0 },
//       { input: qrCodeBuffer, top: 260, left: 400 },
//     ])
//     .png()
//     .toFile(outputPath);

//   return outputPath;
// }

async function generateCertificate(data, outputPath = 'certificate.png') {
  const qrData = `https://testnet.explorer.perawallet.app/tx/${data.blockchain_tx}`;
  const qrCodeBuffer = await QRCode.toBuffer(qrData, {
    margin: 2,
    color: {
      dark: '#1a365d',  // Navy blue QR
      light: '#f8fafc'  // Very light blue background
    }
  });

  // 1. Create a certificate frame with decorative elements
  const frameSvg = `
    <svg width="800" height="600">
      <!-- Background with subtle pattern -->
      <rect width="100%" height="100%" fill="#f8fafc" />
      <path d="M0,0 L800,600 M800,0 L0,600" stroke="#e2e8f0" stroke-width="1"/>
      
      <!-- Decorative header -->
      <rect x="0" y="0" width="800" height="120" fill="#1e40af" />
      <text x="400" y="70" 
            font-family="Arial" 
            font-size="28" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle">OFFICIAL VACCINATION RECORD</text>
      
      <!-- Organization logo placeholder -->
      <circle cx="700" cy="60" r="40" fill="white" opacity="0.2"/>
      
      <!-- Main content area -->
      <rect x="40" y="150" width="720" height="380" rx="8" 
            fill="white" stroke="#cbd5e1" stroke-width="1"/>
      
      <!-- Watermark -->
      <text x="400" y="300" 
            font-family="Arial" 
            font-size="120" 
            fill="#e2e8f0" 
            font-weight="bold" 
            text-anchor="middle" 
            opacity="0.3">VALID</text>
    </svg>`;

  // 2. Content with improved typography
  const contentSvg = `
    <svg width="720" height="380">
      <style>
        .header { font-family: 'Arial'; font-size: 18px; font-weight: bold; fill: #1e40af; }
        .label { font-family: 'Arial'; font-size: 14px; fill: #64748b; }
        .value { font-family: 'Arial'; font-size: 16px; fill: #1e293b; font-weight: 500; }
        .divider { stroke: #e2e8f0; stroke-width: 1; }
      </style>
      
      <!-- Patient Information -->
      <text x="20" y="40" class="header">PATIENT INFORMATION</text>
      <line x1="20" y1="50" x2="300" y2="50" class="divider"/>
      
      <text x="20" y="80" class="label">Full Name:</text>
      <text x="120" y="80" class="value">${data.childName}</text>
      
      <text x="20" y="110" class="label">Date of Birth:</text>
      <text x="120" y="110" class="value">${data.childDOB}</text>
      
      <text x="20" y="140" class="label">Patient ID:</text>
      <text x="120" y="140" class="value">${data.childIdHash.substring(0, 12)}...</text>
      
      <!-- Vaccination Details -->
      <text x="20" y="190" class="header">VACCINATION DETAILS</text>
      <line x1="20" y1="200" x2="300" y2="200" class="divider"/>
      
      <text x="20" y="230" class="label">Vaccine:</text>
      <text x="140" y="230" class="value">${data.vaccineId}</text>
      
      <text x="20" y="260" class="label">Dose Number:</text>
      <text x="140" y="260" class="value">${data.doseNumber}</text>
      
      <text x="20" y="290" class="label">Batch Number:</text>
      <text x="140" y="290" class="value">${data.batchNumber}</text>
      
      <text x="20" y="320" class="label">Date Administered:</text>
      <text x="140" y="320" class="value">${new Date(data.dateAdministered).toLocaleDateString()}</text>
      
      <!-- Provider Information -->
      <text x="400" y="40" class="header">PROVIDER INFORMATION</text>
      <line x1="400" y1="50" x2="700" y2="50" class="divider"/>
      
      <text x="400" y="80" class="label">Health Worker:</text>
      <text x="500" y="80" class="value">${data.provider}</text>
      
      <text x="400" y="110" class="label">Facility:</text>
      <text x="500" y="110" class="value">${data.location}</text>
      
      <!-- Blockchain Verification -->
      <text x="400" y="160" class="header">BLOCKCHAIN VERIFICATION</text>
      <line x1="400" y1="170" x2="700" y2="170" class="divider"/>
      
      <text x="400" y="200" class="label">Transaction ID:</text>
      <text x="500" y="200" class="value">${data.blockchainTxId}</text>
      
      <text x="400" y="230" class="label">Network:</text>
      <text x="500" y="230" class="value">Algorand Testnet</text>
      
      <!-- QR Code Label -->
      <text x="550" y="375" class="label" text-anchor="middle">Scan to verify on blockchain</text>
    </svg>`;

  // 3. Generate final certificate
  await sharp(Buffer.from(frameSvg))
    .composite([
      { 
        input: Buffer.from(contentSvg), 
        top: 150, 
        left: 40 
      },
      { 
        input: qrCodeBuffer,
        top: 350,
        left: 520,
      },
      // Add your organization logo here if available
      // { input: 'logo.png', top: 30, left: 30 }
    ])
    .png()
    .toFile(outputPath);

  return outputPath;
}

async function uploadToPinata(filePath) {
  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
    maxContentLength: 'Infinity',
    headers: {
      ...data.getHeaders(),
      Authorization: PINATA_JWT,
    },
  });

  const cid = res.data.IpfsHash;
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

// 👇 Full flow to generate + upload + return assetURL
async function createVaccinationAssetImage(data) {
  const imagePath = await generateCertificate(data);
  const imageUrl = await uploadToPinata(imagePath);
  return imageUrl;
}

module.exports = createVaccinationAssetImage;
