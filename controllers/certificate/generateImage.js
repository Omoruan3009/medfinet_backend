const fs = require("fs");
const sharp = require("sharp");
const QRCode = require("qrcode");

async function generateCertificate(data, outputPath = "cert.png") {
  const qrData = `https://algoexplorer.io/tx/${data.blockchain_tx}`;
  const qrCodeBuffer = await QRCode.toBuffer(qrData);

  const base = sharp({
    create: {
      width: 600,
      height: 400,
      channels: 3,
      background: "#ffffff",
    },
  });

  const svgText = `
    <svg width="600" height="400">
      <style>
        .title { fill: #222; font-size: 24px; font-weight: bold; }
        .label { fill: #444; font-size: 16px; }
      </style>
      <text x="30" y="40" class="title">Digital Vaccination Record</text>
      <text x="30" y="80" class="label">Child ID: ${data.child_id}</text>
      <text x="30" y="110" class="label">Vaccine: ${data.vaccine_id}</text>
      <text x="30" y="140" class="label">Dose #: ${data.dose_number}</text>
      <text x="30" y="170" class="label">Batch #: ${data.batch_number}</text>
      <text x="30" y="200" class="label">Date: ${data.date_given}</text>
      <text x="30" y="230" class="label">Health Worker: ${data.provider}</text>
      <text x="30" y="260" class="label">Facility: ${data.location}</text>
    </svg>`;

  const image = await base
    .composite([
      { input: Buffer.from(svgText), top: 0, left: 0 },
      { input: qrCodeBuffer, top: 280, left: 400 },
    ])
    .png()
    .toFile(outputPath);

  return outputPath;
}
module.exports = generateCertificate;
