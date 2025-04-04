# Ordinarinos Inscription Tool: Frequently Asked Questions

## General Questions

### What is Ordinarinos?
Ordinarinos is a comprehensive web application for Bitcoin Ordinals inscriptions that simplifies the process of transferring files to your Ordinals node and executing inscription commands. It serves as a bridge between your web browser and a running Ordinals node Docker container.

### What can I do with Ordinarinos?
Ordinarinos allows you to:
- Upload and inscribe images and 3D models onto the Bitcoin blockchain
- Create and inscribe text with various encoding options (including ciphers and ancient scripts)
- Create and inscribe formatted Markdown content with live preview
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
- Text: TXT, plain text
- Markdown: MD
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

### Why does my text look different after applying an encoding?
When you change the encoding of text, particularly when using ciphers or ancient scripts, the visual representation will change. Some notes on encodings:
- Ancient scripts (Hieroglyphics and Cuneiform) are primarily intended for one-way conversion and may not decode perfectly
- When using specialized encodings like Base64 or Hexadecimal, non-ASCII characters may not be properly represented
- You can always revert to UTF-8 encoding to see your original text

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

## Umbrel Installation Guide

### How do I install Ordinarinos on Umbrel?
There are two ways to install Ordinarinos on Umbrel:

**Method 1: Using the Umbrel App Store**
1. In your Umbrel dashboard, go to "App Store"
2. Click on "Add App Store" 
3. Enter the following URL: `https://github.com/ordinarinos/umbrel-app-store`
4. Click "Add App Store"
5. Find Ordinarinos in the list of available apps and click "Install"
6. Wait for the installation to complete
7. Access Ordinarinos at `http://umbrel.local:3500` or `http://[your-umbrel-ip]:3500`

**Method 2: Manual Installation**
1. SSH into your Umbrel server
2. Navigate to the apps directory: `cd ~/umbrel/apps`
3. Clone the repository: `git clone https://github.com/ordinarinos/ordinarinos`
4. Enter the directory: `cd ordinarinos`
5. Run the installation script: `./umbrel-install.sh`
6. Access Ordinarinos at `http://umbrel.local:3500` or `http://[your-umbrel-ip]:3500`

### What are the prerequisites for running Ordinarinos on Umbrel?
Ordinarinos on Umbrel requires:
1. A running Umbrel instance (version 0.5.0 or later)
2. Bitcoin Core app installed and fully synced
3. Ordinals app installed and operational
4. At least 5GB of free space for the file cache

### How does Ordinarinos integrate with Umbrel's Bitcoin and Ordinals services?
Ordinarinos automatically detects and connects to Umbrel's Bitcoin Core and Ordinals services using Umbrel's internal networking. The application is preconfigured to:
- Connect to Bitcoin Core via RPC at `bitcoin.embassy:8332`
- Connect to the Ordinals node API at `ord.embassy:8080`
- Use the correct authentication credentials from environment variables
- Access the Ordinals container for executing inscription commands

This means you don't need to configure anything manually - Ordinarinos works with your Umbrel setup out of the box.

### How do I configure port settings on Umbrel?
The default port for Ordinarinos is 3500. On Umbrel, this is managed through the `umbrel-app.yml` configuration:

1. **Default Configuration**: By default, Ordinarinos runs on port 3500 and is accessible at `http://umbrel.local:3500`

2. **Changing the Port**:
   - If you need to change the port, you'll need to modify both the `umbrel-app.yml` and `docker-compose.umbrel.yml` files
   - In `umbrel-app.yml`, update the `port` field and the `ports` section under containers
   - In `docker-compose.umbrel.yml`, update the `ports` mapping
   - Restart the application for changes to take effect

3. **Port Conflicts**: If you experience port conflicts (another service using port 3500):
   - Change the external port mapping in `docker-compose.umbrel.yml` from `"3500:3500"` to something like `"3501:3500"`
   - The application will still run on port 3500 internally but will be accessible on port 3501 externally

### What alternative configurations are available for Umbrel installations?

**1. Direct Connection Mode**
- Default: `DIRECT_CONNECT: "true"`
- This allows Ordinarinos to communicate directly with your Ordinals node
- For enhanced security, you can set this to `"false"` and use API-only mode

**2. Custom Data Directory**
- Default: The data is stored in `${APP_DATA_DIR}/data`
- You can modify the volume mapping in `docker-compose.umbrel.yml` to use a different directory

**3. Resource Allocation**
- You can add resource limits (CPU, memory) in the `docker-compose.umbrel.yml` file if your system has limited resources
- Example:
  ```yaml
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
  ```

**4. Network Configuration**
- By default, Ordinarinos connects to both the default network and the embassy network
- You can modify the networks section in `docker-compose.umbrel.yml` if you have a custom network setup

### Troubleshooting Umbrel Installations

**1. Connection Issues with Ordinals Node**
- **Symptom**: Unable to connect to Ordinals node
- **Check**: Ensure the Ordinals app is installed and running on your Umbrel
- **Solution**: Restart both the Ordinals app and Ordinarinos
- **Verification**: Access `http://umbrel.local:3500/api/status` to check connectivity status

**2. Bitcoin Core Connection Problems**
- **Symptom**: Unable to retrieve Bitcoin fee estimates or verify UTXO data
- **Check**: Verify Bitcoin Core is running and fully synced
- **Solution**: Ensure your Umbrel's Bitcoin app is operational and fully synced
- **Advanced**: Check the logs with `~/umbrel/scripts/app logs ordinarinos-inscriptions`

**3. Permission Issues**
- **Symptom**: Unable to write to data directory or execute commands
- **Check**: Verify that the data directory permissions are correct
- **Solution**: Run `sudo chown -R 1000:1000 ~/umbrel/app-data/ordinarinos-inscriptions/data`

**4. Port Accessibility Issues**
- **Symptom**: Cannot access the Ordinarinos web interface
- **Check**: Try accessing via IP address instead of umbrel.local
- **Solution**: Ensure your firewall allows access to port 3500
- **Alternative**: Try a different browser or clear your browser cache

**5. Persistent Docker Errors**
- **Symptom**: Container fails to start or crashes repeatedly
- **Solution**: Try the following steps:
  ```
  cd ~/umbrel
  ./scripts/app stop ordinarinos-inscriptions
  ./scripts/app start ordinarinos-inscriptions
  ./scripts/app logs ordinarinos-inscriptions
  ```

**6. "Ord container not found" Error**
- **Symptom**: Error message about missing Ord container
- **Check**: Verify the Ordinals app name with `docker ps | grep ord`
- **Solution**: The container may have a different name than expected. Check the actual name and update your configuration accordingly.

## Text and Markdown Inscriptions

### How do I create text inscriptions?
Ordinarinos provides a specialized text editor that allows you to create and inscribe plain text:
1. Navigate to the Text section of Ordinarinos
2. Enter your text content in the editor
3. Configure file name and encoding options
4. Save your text to the cache
5. Configure inscription settings and submit

### What encoding options are available for text inscriptions?
Ordinarinos supports multiple text encoding options:
- Standard Encodings: UTF-8, ASCII, UTF-16
- Substitution Ciphers: Caesar Cipher, Atbash, ROT13, Morse Code, Binary, Hexadecimal, Base64
- Ancient Scripts: Egyptian Hieroglyphics, Sumerian Cuneiform

### How do the text encoding options work?
- **UTF-8**: Standard Unicode encoding suitable for most languages
- **ASCII**: Basic English alphabet and symbols (7-bit)
- **UTF-16**: Extended Unicode encoding supporting a wider range of characters
- **Caesar Cipher**: Classic substitution cipher that shifts letters by 3 positions
- **Atbash**: Reverses the alphabet (A becomes Z, B becomes Y, etc.)
- **ROT13**: Rotates letters by 13 positions in the alphabet
- **Morse Code**: Converts text to dots and dashes
- **Binary**: Converts each character to its binary representation
- **Hexadecimal**: Converts each character to hexadecimal values
- **Base64**: Encodes text in Base64 format
- **Egyptian Hieroglyphics**: Converts text to hieroglyphic symbols
- **Sumerian Cuneiform**: Converts text to cuneiform symbols

### How does the markdown editor work?
The markdown editor provides a rich editing environment for creating formatted content:
1. Use the toolbar to apply formatting (headings, bold, lists, etc.)
2. Preview your markdown in real-time
3. Save your markdown to the cache
4. Configure inscription settings and submit

### How can I optimize my text or markdown inscriptions?
Both text and markdown editors include an "Optimize" button that:
- Removes excess whitespace
- Standardizes line breaks
- Reduces file size
- In markdown, ensures proper formatting of headings

### Can I batch process text and markdown files?
Yes, the batch text manager allows you to:
- Create multiple text or markdown files
- Toggle selection of specific files
- Process them together with the same inscription settings
- Track their status in the batch processing queue

### Are saved text and markdown files included in the cache management?
Yes, all text and markdown files that you save are:
- Stored in the application's file cache
- Subject to the same 5GB cache limit as images
- Automatically cleaned up when the cache limit is reached
- Available for viewing and management in the Cache Manager

## BRC-20 Token Inscriptions

### What are BRC-20 tokens?
BRC-20 is a token standard for fungible tokens on the Bitcoin blockchain using Ordinals. It enables the creation (deploy), distribution (mint), and transfer of tokens with Bitcoin transactions, similar to how ERC-20 tokens work on Ethereum.

### What operations can I perform with BRC-20 tokens?
Ordinarinos lets you perform all three core BRC-20 operations:
- **Deploy**: Create a new token with a ticker (1-4 characters), max supply, and optional mint limit
- **Mint**: Create new tokens of an existing BRC-20 token up to its maximum supply
- **Transfer**: Move tokens from your wallet to another address

### How do I deploy a new BRC-20 token?
To deploy a new BRC-20 token with Ordinarinos:
1. Navigate to the BRC-20 tab and select "Deploy"
2. Enter a ticker (1-4 alphanumeric characters)
3. Set the maximum supply for your token
4. (Optional) Set a mint limit per inscription
5. Select a fee rate (economy, average, priority, or custom)
6. (Optional) Specify a destination address
7. Generate and execute the inscription commands

### How do I mint BRC-20 tokens?
To mint existing BRC-20 tokens:
1. Navigate to the BRC-20 tab and select "Mint"
2. Enter the ticker of an existing token
3. Specify the amount to mint (must be within mint limits)
4. Select a fee rate
5. (Optional) Specify a destination address
6. Generate and execute the inscription commands

### How do I transfer BRC-20 tokens?
To transfer BRC-20 tokens:
1. Navigate to the BRC-20 tab and select "Transfer"
2. Enter the ticker of the token you want to transfer
3. Specify the amount to transfer
4. Select a fee rate
5. Enter the destination address
6. Generate and execute the inscription commands

### How can I check if a BRC-20 token already exists?
When you enter a ticker in the deploy tab, Ordinarinos automatically checks if the token has already been deployed. It will show:
- A green badge if the ticker is available for deployment
- A red badge if the ticker has already been deployed

### Does Ordinarinos validate token information?
Yes, Ordinarinos integrates with the GeniiData API to verify token information including:
- If a token exists
- Its maximum supply
- Mint limits
- Total minted amount
- Whether minting is complete

This information helps ensure you're making informed decisions about BRC-20 operations.

### How does the BRC-20 fee calculator work?
The BRC-20 fee calculator shows a detailed breakdown of the inscription costs:
- Transaction Size: The size of the BRC-20 operation transaction in vBytes
- Base Fee: The minimum cost for the transaction
- Inscription Fee: The fee based on your selected rate (sats/vB)
- Total Fee: The combined total fee in satoshis
- Processing Time: Estimated time for the transaction to be confirmed

You can choose from preset fee rates (economy, average, priority) or set a custom rate.

## Bitmap Inscriptions

### What are bitmap inscriptions?
Bitmap inscriptions are a unique type of ordinal that represent specific districts or numbers on the Bitcoin blockchain. Each bitmap represents a unique district that can be inscribed and traded, creating on-chain communities around specific bitmap numbers.

### How do I create a bitmap inscription?
To create a bitmap inscription with Ordinarinos:
1. Navigate to the Bitmap Inscription section
2. Enter the bitmap number you wish to inscribe
3. Click "Check" to verify its availability
4. Select a fee rate (economy, standard, priority, or custom)
5. Optionally provide a destination address
6. Generate and execute the inscription commands

### How can I verify if a bitmap is available?
Ordinarinos provides a built-in bitmap availability checker that:
- Verifies if the bitmap number has already been inscribed
- Shows the current availability status with clear indicators
- Provides immediate feedback about validity
- Connects to the Bitcoin blockchain to check the latest status

### How does the bitmap fee calculator work?
The bitmap fee calculator shows a detailed breakdown of the inscription costs:
- Transaction Size: The size of the bitmap inscription transaction in vBytes
- Base Fee: The minimum cost for the transaction
- Inscription Fee: The fee based on your selected rate (sats/vB)
- Total Fee: The combined total fee in satoshis
- Processing Time: Estimated time for the transaction to be confirmed

The calculator updates dynamically when you change fee rates, allowing you to make informed decisions about your inscription costs.

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
- `/api/cache/info`: Get information about the file cache
- `/api/cache/clear`: Clear all cached files
- `/api/cache/save-text`: Save text content to the cache
- `/api/cache/file/:filename`: Get or delete a specific cached file

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
- Advanced batch processing for images, text, and markdown
- Comprehensive history tracking
- Smart image optimization
- Advanced text encoding options (including ciphers and ancient scripts)
- Rich markdown editing with live preview
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

### How does the fee calculator work?
The fee calculator helps you understand the cost breakdown of your inscriptions:
- Transaction Size: Shows the size of your transaction in vBytes
- Base Fee: The minimum fee required for the transaction
- Inscription Fee: The fee based on your selected rate (sats/vB)
- Total Fee: The combined total fee in satoshis
- Processing Time: Estimated time for the transaction to be confirmed

The calculator updates automatically when you change fee rates, allowing you to compare costs between economy, standard, priority, and custom fee tiers.

### Can I use Ordinarinos on my mobile device?
Yes, Ordinarinos is designed with a responsive interface that works on mobile devices. However, for the best experience, we recommend using a desktop browser, especially when working with batch processing or complex inscriptions.
## BRC-20 Token Inscriptions

### What are BRC-20 tokens?
BRC-20 is a token standard for fungible tokens on the Bitcoin blockchain using Ordinals. It enables the creation (deploy), distribution (mint), and transfer of tokens with Bitcoin transactions, similar to how ERC-20 tokens work on Ethereum.

### What operations can I perform with BRC-20 tokens?
Ordinarinos lets you perform all three core BRC-20 operations:
- **Deploy**: Create a new token with a ticker (1-4 characters), max supply, and optional mint limit
- **Mint**: Create new tokens of an existing BRC-20 token up to its maximum supply
- **Transfer**: Move tokens from your wallet to another address

### How do I deploy a new BRC-20 token?
To deploy a new BRC-20 token with Ordinarinos:
1. Navigate to the BRC-20 tab and select "Deploy"
2. Enter a ticker (1-4 alphanumeric characters)
3. Set the maximum supply for your token
4. (Optional) Set a mint limit per inscription
5. Select a fee rate (economy, average, priority, or custom)
6. (Optional) Specify a destination address
7. Generate and execute the inscription commands

### How do I mint BRC-20 tokens?
To mint existing BRC-20 tokens:
1. Navigate to the BRC-20 tab and select "Mint"
2. Enter the ticker of an existing token
3. Specify the amount to mint (must be within mint limits)
4. Select a fee rate
5. (Optional) Specify a destination address
6. Generate and execute the inscription commands

### How do I transfer BRC-20 tokens?
To transfer BRC-20 tokens:
1. Navigate to the BRC-20 tab and select "Transfer"
2. Enter the ticker of the token you want to transfer
3. Specify the amount to transfer
4. Select a fee rate
5. Enter the destination address
6. Generate and execute the inscription commands

### How can I check if a BRC-20 token already exists?
When you enter a ticker in the deploy tab, Ordinarinos automatically checks if the token has already been deployed. It will show:
- A green badge if the ticker is available for deployment
- A red badge if the ticker has already been deployed

### Does Ordinarinos validate token information?
Yes, Ordinarinos integrates with the GeniiData API to verify token information including:
- If a token exists
- Its maximum supply
- Mint limits
- Total minted amount
- Whether minting is complete

This information helps ensure you're making informed decisions about BRC-20 operations.

### How does the BRC-20 fee calculator work?
The BRC-20 fee calculator shows a detailed breakdown of the inscription costs:
- Transaction Size: The size of the BRC-20 operation transaction in vBytes
- Base Fee: The minimum cost for the transaction
- Inscription Fee: The fee based on your selected rate (sats/vB)
- Total Fee: The combined total fee in satoshis
- Processing Time: Estimated time for the transaction to be confirmed

You can choose from preset fee rates (economy, average, priority) or set a custom rate.

### How does Ordinarinos process BRC-20 inscriptions?
BRC-20 token operations are processed entirely through your local Ordinals node, just like other inscription types. The process works as follows:
1. Ordinarinos generates the proper JSON format for the selected operation (deploy, mint, or transfer)
2. The application sends this command to your local Ordinals node container
3. Your Ordinals node performs the inscription and broadcasts it to the Bitcoin network
4. The transaction is tracked in the Inscription Status section

While Ordinarinos uses the GeniiData API to validate token existence and check information (max supply, mint limits, etc.), all actual inscription transactions happen directly on your Ordinals node using your node's wallet. This means BRC-20 operations require your Ordinals node to be running properly.

### What happens behind the scenes when I deploy a BRC-20 token?
When you deploy a BRC-20 token:
1. Ordinarinos creates a JSON payload that follows the BRC-20 standard format:
   ```json
   {
     "p": "brc-20",
     "op": "deploy",
     "tick": "EXMP",
     "max": "21000000",
     "lim": "1000"
   }
   ```
2. This JSON is inscribed onto a satoshi using your Ordinals node
3. Once confirmed on the blockchain, the token is officially deployed
4. Other users can view and interact with your token using any BRC-20 compatible application

### Are there any special requirements for BRC-20 operations?
BRC-20 operations have the same requirements as other inscriptions, but with these considerations:
- **Deploy**: You can only deploy tokens that haven't been claimed yet
- **Mint**: You can only mint up to the limit per mint (if set) and can't exceed the maximum supply
- **Transfer**: You must own the token you're trying to transfer

The application's interface will guide you through these requirements and display validation messages to help prevent errors.

### How are BRC-20 token balances tracked?
Unlike conventional blockchains, BRC-20 tokens don't have built-in accounting. Instead:
1. Indexers like GeniiData scan the blockchain for BRC-20 inscriptions
2. They interpret deploy, mint, and transfer operations to calculate balances
3. Ordinarinos queries these indexers to show token information
4. Your actual balance is determined by what inscriptions you own

This means your BRC-20 balances are directly tied to the inscriptions in your wallet.

## Umbrel Installation Guide

### How do I install Ordinarinos on Umbrel?
There are two ways to install Ordinarinos on Umbrel:

**Method 1: Using the Umbrel App Store**
1. In your Umbrel dashboard, go to "App Store"
2. Click on "Add App Store" 
3. Enter the following URL: `https://github.com/ordinarinos/umbrel-app-store`
4. Click "Add App Store"
5. Find Ordinarinos in the list of available apps and click "Install"
6. Wait for the installation to complete
7. Access Ordinarinos at `http://umbrel.local:3500` or `http://[your-umbrel-ip]:3500`

**Method 2: Manual Installation**
1. SSH into your Umbrel server
2. Navigate to the apps directory: `cd ~/umbrel/apps`
3. Clone the repository: `git clone https://github.com/ordinarinos/ordinarinos`
4. Enter the directory: `cd ordinarinos`
5. Run the installation script: `./umbrel-install.sh`
6. Access Ordinarinos at `http://umbrel.local:3500` or `http://[your-umbrel-ip]:3500`

### What are the prerequisites for running Ordinarinos on Umbrel?
Ordinarinos on Umbrel requires:
1. A running Umbrel instance (version 0.5.0 or later)
2. Bitcoin Core app installed and fully synced
3. Ordinals app installed and operational
4. At least 5GB of free space for the file cache

### How does Ordinarinos integrate with Umbrel's Bitcoin and Ordinals services?
Ordinarinos automatically detects and connects to Umbrel's Bitcoin Core and Ordinals services using Umbrel's internal networking. The application is preconfigured to:
- Connect to Bitcoin Core via RPC at `bitcoin.embassy:8332`
- Connect to the Ordinals node API at `ord.embassy:8080`
- Use the correct authentication credentials from environment variables
- Access the Ordinals container for executing inscription commands

This means you don't need to configure anything manually - Ordinarinos works with your Umbrel setup out of the box.

### How do I configure port settings on Umbrel?
The default port for Ordinarinos is 3500. On Umbrel, this is managed through the `umbrel-app.yml` configuration:

1. **Default Configuration**: By default, Ordinarinos runs on port 3500 and is accessible at `http://umbrel.local:3500`

2. **Changing the Port**:
   - If you need to change the port, you'll need to modify both the `umbrel-app.yml` and `docker-compose.umbrel.yml` files
   - In `umbrel-app.yml`, update the `port` field and the `ports` section under containers
   - In `docker-compose.umbrel.yml`, update the `ports` mapping
   - Restart the application for changes to take effect

3. **Port Conflicts**: If you experience port conflicts (another service using port 3500):
   - Change the external port mapping in `docker-compose.umbrel.yml` from `"3500:3500"` to something like `"3501:3500"`
   - The application will still run on port 3500 internally but will be accessible on port 3501 externally

### What alternative configurations are available for Umbrel installations?

**1. Direct Connection Mode**
- Default: `DIRECT_CONNECT: "true"`
- This allows Ordinarinos to communicate directly with your Ordinals node
- For enhanced security, you can set this to `"false"` and use API-only mode

**2. Custom Data Directory**
- Default: The data is stored in `${APP_DATA_DIR}/data`
- You can modify the volume mapping in `docker-compose.umbrel.yml` to use a different directory

**3. Resource Allocation**
- You can add resource limits (CPU, memory) in the `docker-compose.umbrel.yml` file if your system has limited resources
- Example:
  ```yaml
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
  ```

**4. Network Configuration**
- By default, Ordinarinos connects to both the default network and the embassy network
- You can modify the networks section in `docker-compose.umbrel.yml` if you have a custom network setup

### Troubleshooting Umbrel Installations

**1. Connection Issues with Ordinals Node**
- **Symptom**: Unable to connect to Ordinals node
- **Check**: Ensure the Ordinals app is installed and running on your Umbrel
- **Solution**: Restart both the Ordinals app and Ordinarinos
- **Verification**: Access `http://umbrel.local:3500/api/status` to check connectivity status

**2. Bitcoin Core Connection Problems**
- **Symptom**: Unable to retrieve Bitcoin fee estimates or verify UTXO data
- **Check**: Verify Bitcoin Core is running and fully synced
- **Solution**: Ensure your Umbrel's Bitcoin app is operational and fully synced
- **Advanced**: Check the logs with `~/umbrel/scripts/app logs ordinarinos-inscriptions`

**3. Permission Issues**
- **Symptom**: Unable to write to data directory or execute commands
- **Check**: Verify that the data directory permissions are correct
- **Solution**: Run `sudo chown -R 1000:1000 ~/umbrel/app-data/ordinarinos-inscriptions/data`

**4. Port Accessibility Issues**
- **Symptom**: Cannot access the Ordinarinos web interface
- **Check**: Try accessing via IP address instead of umbrel.local
- **Solution**: Ensure your firewall allows access to port 3500
- **Alternative**: Try a different browser or clear your browser cache

**5. Persistent Docker Errors**
- **Symptom**: Container fails to start or crashes repeatedly
- **Solution**: Try the following steps:
  ```
  cd ~/umbrel
  ./scripts/app stop ordinarinos-inscriptions
  ./scripts/app start ordinarinos-inscriptions
  ./scripts/app logs ordinarinos-inscriptions
  ```

**6. "Ord container not found" Error**
- **Symptom**: Error message about missing Ord container
- **Check**: Verify the Ordinals app name with `docker ps | grep ord`
- **Solution**: The container may have a different name than expected. Check the actual name and update your configuration accordingly.
