# Ordinarinos Inscription Tool: Frequently Asked Questions

## General Questions

### What is Ordinarinos?
Ordinarinos is a comprehensive web application for Bitcoin Ordinals inscriptions that simplifies the process of transferring files to your Ordinals node and executing inscription commands. It serves as a bridge between your web browser and a running Ordinals node Docker container.

### What can I do with Ordinarinos?
Ordinarinos allows you to:
- Upload and inscribe images and 3D models onto the Bitcoin blockchain
- Batch process multiple files at once
- Register Satoshi Name Service (SNS) names
- Target specific rare satoshis for your inscriptions
- Optimize images to reduce file size
- Track and manage your inscription history
- Add custom metadata to your inscriptions

### What are the system requirements?
- Docker and Docker Compose
- A running Bitcoin Ordinals node (such as Umbrel's Ordinals node)
- 5GB of space for the file cache
- Web browser (Chrome, Firefox, Safari, or Edge)

### Is Ordinarinos compatible with Umbrel?
Yes, Ordinarinos is designed to work seamlessly with Umbrel's Bitcoin and Ordinals services. The application automatically detects and connects to Umbrel's Ordinals node.

## Technical Questions

### How does Ordinarinos interact with my Ordinals node?
Ordinarinos uses Docker networking to communicate with your Ordinals node container. It transfers files to the Ordinals data directory and executes inscription commands directly in the node container.

### What file formats are supported?
- Images: JPEG, PNG, WebP (recommended)
- 3D Models: GLB, GLTF
- Size limitations: Files under 60KB are recommended, files over 400KB may require miner coordination

### What is the file size limit for inscriptions?
While Ordinarinos can handle files of any size, Bitcoin network considerations make smaller files more practical:
- Under 60KB: Highly recommended, easiest to confirm quickly
- 60KB-400KB: May require higher fees
- Above 400KB: Require coordination with miners and significantly higher fees

### How does image optimization work?
The image optimization feature converts your images to WebP format at approximately 46KB size, which is an ideal size for inscriptions. This helps reduce transaction costs while maintaining good visual quality.

### What is batch processing?
Batch processing allows you to prepare and process multiple inscriptions (up to 100 files) in a single session. You can configure parameters like fee rate and destination address once, then apply them to all selected files.

### How does the rare satoshi selection work?
The rare satoshi selector allows you to target specific satoshis with unique properties (like block height, date, or rarity) for your inscriptions. Ordinarinos provides information about each rare sat type and allows you to select them for your inscriptions.

### What happens if my inscription fails?
Failed inscriptions are tracked in the Inscription Status section with detailed error messages. You can retry failed inscriptions or remove them from your history.

### Are inscriptions permanent?
Yes, once an inscription is confirmed on the Bitcoin blockchain, it is immutable and permanent. The "delete" and "clear" functions in the history management only affect your local tracking records, not the actual blockchain data.

## SNS (Sats Names Service) Questions

### What is SNS (Sats Names Service)?
SNS is a decentralized naming system built on Bitcoin that allows you to register unique names. Similar to domain names on the internet, SNS names can be used to identify Bitcoin addresses and more.

### How do I register an SNS name?
1. Navigate to the SNS section of Ordinarinos
2. Search for your desired name to check availability
3. Connect your Bitcoin wallet (Xverse, Leather, or Unisat)
4. Choose a fee tier (economy, normal, or custom)
5. Confirm and pay for the registration
6. Track the status of your registration

### What happens if the SNS relay is unavailable?
Ordinarinos includes a degraded functionality mode that activates automatically when the SNS relay service is unavailable. In this mode:
- Name availability checks will continue to work with approximate results
- Fee estimates remain available
- Clear status indicators show when the service is in degraded mode
- The application automatically reconnects when the service becomes available

### What wallets are supported for SNS registration?
Ordinarinos supports connection to the following wallets:
- Xverse
- Leather (formerly BlockStack)
- Unisat

### How are SNS registration fees calculated?
SNS registration fees consist of:
- Inscription fee: Cost to inscribe the name
- Network fee: Bitcoin transaction fee (varies with network congestion)
- Service fee: Fee for the SNS service (typically 2000 sats)

## Troubleshooting

### My image looks different after inscription
This is normal if image optimization was enabled. The optimization process converts images to WebP format at approximately 46KB, which may result in some visual differences while maintaining good quality.

### I can't connect to my Ordinals node
- Check that your Ordinals node container is running (`docker ps`)
- Verify that the container name matches the one configured in Ordinarinos
- Make sure Docker networking is properly set up
- Check that your Ordinals node API is accessible

### How do I check if my inscription was successful?
Successful inscriptions will show in the Inscription Status section with:
- A green "Success" badge
- A transaction ID that you can copy
- A link to view the inscription on the Ordinals explorer

### Why do some rare sats appear unavailable?
Rare satoshis have to meet specific criteria to be available for inscription. A satoshi may be unavailable if:
- It's already been spent
- It's below the required maturity threshold
- It's not in a UTXO that your wallet can spend

### I received an "insufficient funds" error when inscribing
This typically means that your Ordinals wallet doesn't have enough Bitcoin to cover:
- The cost of the satoshi being inscribed
- The transaction fees
- Any additional fees required

Deposit more Bitcoin to your Ordinals wallet address and try again.

## Administration & Maintenance

### How is the file cache managed?
Ordinarinos manages a local file cache with a 5GB limit:
- Files are cached for future use to avoid reprocessing
- You can manually clear individual files or the entire cache
- The system automatically removes the oldest files when the cache limit is reached

### Can I change the port Ordinarinos runs on?
Yes, the default port is 3500, but you can modify this in the `docker-compose.yml` file by changing the port mapping.

### How do I update Ordinarinos?
1. Download the latest release
2. Stop the running container: `docker-compose down`
3. Replace the existing files with the new release
4. Start the application: `docker-compose up -d`

### How can I back up my inscription history?
The inscription history is stored in the application's database. To back it up:
1. Stop the application: `docker-compose down`
2. Copy the database file (located in the data directory)
3. Store the backup in a safe location
4. Restart the application: `docker-compose up -d`

## Advanced Usage

### Can I customize the metadata for my inscriptions?
Yes, the metadata editor allows you to add any valid JSON data to your inscriptions. This metadata is stored on-chain with your inscription.

### Is it possible to target specific sat ranges?
Yes, when using the rare sat selector, you can target specific sat ranges with unique properties. Each sat type is labeled with its characteristics (block height, date, etc.).

### How can I check the status of the SNS relay connection?
You can check the SNS relay status by accessing:
```
http://localhost:3500/api/sns/status
```
This endpoint shows whether the connection to the SNS relay is active or in degraded mode.

### Can I use Ordinarinos programmatically via API?
Ordinarinos provides several API endpoints that can be used programmatically:
- `/api/inscriptions`: Manage inscription history
- `/api/sns/check`: Check name availability
- `/api/sns/fees`: Get fee estimates
- `/api/cache`: Manage the file cache

For a complete API reference, contact Ordinarinos support.

## Support & Resources

### Where can I get help?
For support, visit [ordinarinos.com](https://ordinarinos.com) or contact support at support@ordinarinos.com.

### Where can I report bugs or request features?
Please report bugs or request features through our GitHub repository or by contacting support directly.

### Is there a community forum?
Yes, join our community on Discord or Telegram to connect with other users and get help. Links are available on our website.

### How can I contribute to Ordinarinos?
We welcome contributions! Check our GitHub repository for contribution guidelines, or contact us if you'd like to get involved in development, testing, or documentation.

## Miscellaneous

### What makes Ordinarinos different from other inscription tools?
Ordinarinos focuses on providing a seamless user experience with powerful features like:
- Direct integration with your Ordinals node
- Advanced batch processing
- Comprehensive history tracking
- Smart image optimization
- Rare sat targeting
- Full SNS integration
- Detailed real-time feedback

### Is Ordinarinos open source?
Please check our GitHub repository or contact Ordinarinos for the current licensing information.

### How are transaction fees calculated?
Transaction fees are calculated based on:
- File size: Larger files require more blockchain space and higher fees
- Network congestion: Fees increase during high network activity
- Priority level: Economy, normal, or custom fee tiers
- Additional services: SNS registration includes service fees

### Can I use Ordinarinos on my mobile device?
Yes, Ordinarinos is designed with a responsive interface that works on mobile devices. However, for the best experience, we recommend using a desktop browser, especially when working with batch processing or complex inscriptions.