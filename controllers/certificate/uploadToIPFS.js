const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");
require("dotenv").config();


const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_TOKEN });

async function uploadToIPFS(imagePath, metadata) {
  const image = await fs.promises.readFile(imagePath);

  const metadataContent = {
    name: "Vaccination Certificate",
    description: "Blockchain-based immunization record",
    image: new File([image], "certificate.png", { type: "image/png" }),
    properties: metadata,
  };

  const metadataCid = await client.store(metadataContent);
  return metadataCid.url; // ipfs://...
}

module.exports = uploadToIPFS;
