import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// FAQ content structure
interface FaqCategory {
  title: string;
  id: string;
  questions: Array<{
    question: string;
    answer: string | JSX.Element;
    id: string;
  }>;
}

export default function FaqPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [faqContent, setFaqContent] = useState<FaqCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading the FAQ content
    setIsLoading(true);
    
    // Define the FAQ content
    const content: FaqCategory[] = [
      {
        title: "General Questions",
        id: "general",
        questions: [
          {
            question: "What is Ordinarinos?",
            answer: "Ordinarinos is a comprehensive web application for Bitcoin Ordinals inscriptions that simplifies the process of transferring files to your Ordinals node and executing inscription commands. It serves as a bridge between your web browser and a running Ordinals node Docker container.",
            id: "what-is-ordinarinos"
          },
          {
            question: "What can I do with Ordinarinos?",
            answer: (
              <div>
                <p>Ordinarinos allows you to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Upload and inscribe images and 3D models onto the Bitcoin blockchain</li>
                  <li>Batch process multiple files at once</li>
                  <li>Register Satoshi Name Service (SNS) names</li>
                  <li>Target specific rare satoshis for your inscriptions</li>
                  <li>Optimize images to reduce file size</li>
                  <li>Track and manage your inscription history</li>
                  <li>Add custom metadata to your inscriptions</li>
                </ul>
              </div>
            ),
            id: "what-can-i-do"
          },
          {
            question: "What are the system requirements?",
            answer: (
              <div>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Docker and Docker Compose</li>
                  <li>A running Bitcoin Ordinals node (such as Umbrel's Ordinals node)</li>
                  <li>5GB of space for the file cache</li>
                  <li>Web browser (Chrome, Firefox, Safari, or Edge)</li>
                </ul>
              </div>
            ),
            id: "system-requirements"
          },
          {
            question: "Is Ordinarinos compatible with Umbrel?",
            answer: "Yes, Ordinarinos is designed to work seamlessly with Umbrel's Bitcoin and Ordinals services. The application automatically detects and connects to Umbrel's Ordinals node.",
            id: "umbrel-compatibility"
          }
        ]
      },
      {
        title: "Rare Satoshis Explained",
        id: "rare-sats",
        questions: [
          {
            question: "What are rare satoshis?",
            answer: (
              <div>
                <p>Rare satoshis are specific satoshis (the smallest units of bitcoin) that have unique properties based on their position in the Bitcoin blockchain. These satoshis are considered rare due to their historical significance, mathematical properties, or relationship to important Bitcoin events.</p>
                <p className="mt-2">They are identified by their absolute sat number (position in the Bitcoin supply) and are categorized into different types of rarity.</p>
              </div>
            ),
            id: "what-are-rare-sats"
          },
          {
            question: "What types of rare satoshis exist?",
            answer: (
              <div>
                <p>Bitcoin has several categories of rare satoshis:</p>
                <ul className="list-disc pl-6 mt-2 space-y-3">
                  <li>
                    <span className="font-semibold">Block Header Sats (Uncommon)</span>
                    <p className="mt-1">These are the very first satoshi of each block. They represent the beginning of a new block in the blockchain.</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sat #52,500,000,000 (first sat of block #105)</p>
                  </li>
                  <li>
                    <span className="font-semibold">Decade Sats (Uncommon)</span>
                    <p className="mt-1">Satoshis that mark the beginning of a new "decade" in the Bitcoin supply (each 5,250,000,000 sats).</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sat #5,250,000,000 (first decade)</p>
                  </li>
                  <li>
                    <span className="font-semibold">Pizza Sats (Uncommon)</span>
                    <p className="mt-1">Satoshis from the famous Bitcoin pizza transaction when Laszlo Hanyecz paid 10,000 BTC for two pizzas on May 22, 2010.</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sats from block #57043</p>
                  </li>
                  <li>
                    <span className="font-semibold">Palindrome Sats (Rare)</span>
                    <p className="mt-1">Satoshis whose number reads the same backward as forward.</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sat #1,001, #12,321, #12,344,321</p>
                  </li>
                  <li>
                    <span className="font-semibold">Alpha Sats (Rare)</span>
                    <p className="mt-1">The first 256 satoshis in the Bitcoin supply, which come from the genesis block mined by Satoshi Nakamoto.</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sat #0 through #255</p>
                  </li>
                  <li>
                    <span className="font-semibold">Vintage Sats (Rare)</span>
                    <p className="mt-1">Satoshis from the first Bitcoin halving period (blocks 0-209,999).</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Any sat below #10,500,000,000</p>
                  </li>
                  <li>
                    <span className="font-semibold">Nakamoto Sats (Very Rare)</span>
                    <p className="mt-1">Satoshis presumed to have been mined by Satoshi Nakamoto in the early days of Bitcoin.</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sats from blocks believed to be mined by Satoshi</p>
                  </li>
                  <li>
                    <span className="font-semibold">Black Sats (Ultra Rare)</span>
                    <p className="mt-1">Satoshis from blocks that contained critical Bitcoin updates or historic events.</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Example: Sats from key upgrade blocks</p>
                  </li>
                </ul>
              </div>
            ),
            id: "rare-sat-types"
          },
          {
            question: "How are satoshi numbers calculated?",
            answer: (
              <div>
                <p>The absolute satoshi number is calculated using this formula:</p>
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 my-2 font-mono text-sm">
                  satoshi_number = (block_height × 50 × 100,000,000) - reward_satoshis + offset
                </div>
                <p>Where:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><span className="font-semibold">block_height</span>: The block number in the blockchain</li>
                  <li><span className="font-semibold">reward_satoshis</span>: The mining reward for that block in satoshis</li>
                  <li><span className="font-semibold">offset</span>: The position of the satoshi within the transaction</li>
                </ul>
                <p className="mt-2">As Bitcoin undergoes halvings, the calculation must account for the reduced block rewards:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Blocks 0-209,999: 50 BTC reward (5,000,000,000 sats)</li>
                  <li>Blocks 210,000-419,999: 25 BTC reward (2,500,000,000 sats)</li>
                  <li>Blocks 420,000-629,999: 12.5 BTC reward (1,250,000,000 sats)</li>
                  <li>Blocks 630,000-839,999: 6.25 BTC reward (625,000,000 sats)</li>
                </ul>
              </div>
            ),
            id: "sat-number-calculation"
          },
          {
            question: "Why would I want to inscribe on a rare satoshi?",
            answer: (
              <div>
                <p>Inscribing on rare satoshis provides several benefits:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><span className="font-semibold">Additional value</span>: Inscriptions on rare sats often command higher market values</li>
                  <li><span className="font-semibold">Historical significance</span>: Connecting your inscription to an important part of Bitcoin history</li>
                  <li><span className="font-semibold">Scarcity</span>: There are limited numbers of each rare sat type, making your inscription more unique</li>
                  <li><span className="font-semibold">Collectibility</span>: Rare sat inscriptions are sought after by collectors in the Ordinals ecosystem</li>
                </ul>
                <p className="mt-2">However, rare sats can be more expensive to obtain and inscribe, as they require the wallet to specifically target these satoshis during the inscription process.</p>
              </div>
            ),
            id: "why-rare-sats"
          },
          {
            question: "How does Ordinarinos select rare satoshis?",
            answer: (
              <div>
                <p>Ordinarinos provides a specialized Rare Sat Selector that:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-1">
                  <li>Queries your Ordinals wallet to identify available UTXOs (unspent transaction outputs)</li>
                  <li>Analyzes these UTXOs to find which ones contain rare satoshis</li>
                  <li>Displays available rare sats categorized by type with visual indicators</li>
                  <li>Allows you to select specific rare sats for your inscriptions</li>
                  <li>In batch mode, enables selecting multiple rare sats or reusing the same rare sat for multiple inscriptions</li>
                </ol>
                <p className="mt-2">The selector visually indicates available sats with green borders, while unavailable sats have gray borders. In batch mode, selected sats are highlighted with yellow badges showing their selection count.</p>
              </div>
            ),
            id: "ordinarinos-rare-sat-selection"
          }
        ]
      },
      {
        title: "Parent Inscriptions",
        id: "parent-inscriptions",
        questions: [
          {
            question: "What are parent inscriptions?",
            answer: (
              <div>
                <p>Parent inscriptions are a feature of the Ordinals protocol that enables hierarchical relationships between inscriptions. A parent inscription can have multiple child inscriptions linked to it, creating a parent-child relationship on the blockchain.</p>
                <p className="mt-2">This is particularly useful for collections, series, or any content that has a logical grouping or relationship.</p>
              </div>
            ),
            id: "what-are-parent-inscriptions"
          },
          {
            question: "How do parent inscriptions work?",
            answer: (
              <div>
                <p>When you create an inscription with a parent:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-1">
                  <li>The parent inscription must already exist on the blockchain with a valid inscription ID</li>
                  <li>During the inscription process, you specify the parent's inscription ID</li>
                  <li>The Ordinals protocol creates a reference from your new inscription to the parent</li>
                  <li>This relationship is permanently recorded on the blockchain</li>
                  <li>Explorers and indexers can then display these relationships, showing a parent with all its children</li>
                </ol>
              </div>
            ),
            id: "parent-inscriptions-work"
          },
          {
            question: "How to use parent inscriptions in Ordinarinos?",
            answer: (
              <div>
                <p>To create a child inscription with a parent in Ordinarinos:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-2">
                  <li>
                    <span className="font-semibold">Enable Parent Inscription:</span>
                    <p className="mt-1">In the configuration form, look for the "Advanced Options" section and enable the toggle for "Use Parent Inscription".</p>
                  </li>
                  <li>
                    <span className="font-semibold">Enter Parent ID:</span>
                    <p className="mt-1">Provide the full inscription ID of the parent (e.g., "1234567890abcdef1234567890abcdef12345678i0"). This ID must be for an existing inscription.</p>
                  </li>
                  <li>
                    <span className="font-semibold">Configure Other Settings:</span>
                    <p className="mt-1">Complete the rest of your inscription settings as normal (fee rate, destination address, etc.).</p>
                  </li>
                  <li>
                    <span className="font-semibold">Generate and Execute Commands:</span>
                    <p className="mt-1">Generate the inscription commands and execute them. The system will automatically include the parent reference in the inscription command.</p>
                  </li>
                </ol>
                <p className="mt-3 bg-orange-50 dark:bg-gray-800 p-3 rounded-md text-sm">
                  <span className="font-bold">Note:</span> You can only set a parent for inscriptions you create. You cannot change the parent of an existing inscription as inscriptions are immutable once created.
                </p>
              </div>
            ),
            id: "using-parent-inscriptions"
          },
          {
            question: "What are the use cases for parent inscriptions?",
            answer: (
              <div>
                <p>Parent inscriptions are valuable for various applications:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><span className="font-semibold">Collections</span>: Creating a series of related NFTs with a common parent</li>
                  <li><span className="font-semibold">Series</span>: Establishing editions or volumes in a content series</li>
                  <li><span className="font-semibold">Metadata</span>: The parent can contain metadata that applies to all children</li>
                  <li><span className="font-semibold">Upgradeability</span>: While inscriptions themselves can't be modified, children can be added to extend functionality</li>
                  <li><span className="font-semibold">Organizational Structure</span>: Creating hierarchical relationships between content</li>
                  <li><span className="font-semibold">Recursive Inscriptions</span>: Advanced use cases where inscriptions reference each other</li>
                </ul>
                <p className="mt-2">For example, you might create a parent inscription as the cover or identity of a collection, then create child inscriptions for each item in the collection.</p>
              </div>
            ),
            id: "parent-inscription-use-cases"
          }
        ]
      },
      {
        title: "Technical Questions",
        id: "technical",
        questions: [
          {
            question: "How does Ordinarinos interact with my Ordinals node?",
            answer: "Ordinarinos uses Docker networking to communicate with your Ordinals node container. It transfers files to the Ordinals data directory and executes inscription commands directly in the node container.",
            id: "node-interaction"
          },
          {
            question: "What file formats are supported?",
            answer: (
              <div>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Images: JPEG, PNG, WebP (recommended)</li>
                  <li>3D Models: GLB, GLTF</li>
                  <li>Size limitations: Files under 60KB are recommended, files over 400KB may require miner coordination</li>
                </ul>
              </div>
            ),
            id: "file-formats"
          },
          {
            question: "What is the file size limit for inscriptions?",
            answer: (
              <div>
                <p>While Ordinarinos can handle files of any size, Bitcoin network considerations make smaller files more practical:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Under 60KB: Highly recommended, easiest to confirm quickly</li>
                  <li>60KB-400KB: May require higher fees</li>
                  <li>Above 400KB: Require coordination with miners and significantly higher fees</li>
                </ul>
              </div>
            ),
            id: "file-size-limit"
          },
          {
            question: "How does image optimization work?",
            answer: "The image optimization feature converts your images to WebP format at approximately 46KB size, which is an ideal size for inscriptions. This helps reduce transaction costs while maintaining good visual quality.",
            id: "image-optimization"
          },
          {
            question: "What is batch processing?",
            answer: "Batch processing allows you to prepare and process multiple inscriptions (up to 100 files) in a single session. You can configure parameters like fee rate and destination address once, then apply them to all selected files.",
            id: "batch-processing"
          },
          {
            question: "How does the rare satoshi selection work?",
            answer: "The rare satoshi selector allows you to target specific satoshis with unique properties (like block height, date, or rarity) for your inscriptions. Ordinarinos provides information about each rare sat type and allows you to select them for your inscriptions.",
            id: "rare-satoshi"
          },
          {
            question: "What happens if my inscription fails?",
            answer: "Failed inscriptions are tracked in the Inscription Status section with detailed error messages. You can retry failed inscriptions or remove them from your history.",
            id: "inscription-fails"
          },
          {
            question: "Are inscriptions permanent?",
            answer: "Yes, once an inscription is confirmed on the Bitcoin blockchain, it is immutable and permanent. The \"delete\" and \"clear\" functions in the history management only affect your local tracking records, not the actual blockchain data.",
            id: "inscriptions-permanent"
          }
        ]
      },
      {
        title: "SNS (Sats Names Service) Questions",
        id: "sns",
        questions: [
          {
            question: "What is SNS (Sats Names Service)?",
            answer: "SNS is a decentralized naming system built on Bitcoin that allows you to register unique names. Similar to domain names on the internet, SNS names can be used to identify Bitcoin addresses and more.",
            id: "what-is-sns"
          },
          {
            question: "How do I register an SNS name?",
            answer: (
              <div>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>Navigate to the SNS section of Ordinarinos</li>
                  <li>Search for your desired name to check availability</li>
                  <li>Connect your Bitcoin wallet (Xverse, Leather, or Unisat)</li>
                  <li>Choose a fee tier (economy, normal, or custom)</li>
                  <li>Confirm and pay for the registration</li>
                  <li>Track the status of your registration</li>
                </ol>
              </div>
            ),
            id: "register-sns"
          },
          {
            question: "What happens if the SNS relay is unavailable?",
            answer: (
              <div>
                <p>Ordinarinos includes a degraded functionality mode that activates automatically when the SNS relay service is unavailable. In this mode:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Name availability checks will continue to work with approximate results</li>
                  <li>Fee estimates remain available</li>
                  <li>Clear status indicators show when the service is in degraded mode</li>
                  <li>The application automatically reconnects when the service becomes available</li>
                </ul>
              </div>
            ),
            id: "sns-relay-unavailable"
          },
          {
            question: "What wallets are supported for SNS registration?",
            answer: (
              <div>
                <p>Ordinarinos supports connection to the following wallets:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Xverse</li>
                  <li>Leather (formerly BlockStack)</li>
                  <li>Unisat</li>
                </ul>
              </div>
            ),
            id: "supported-wallets"
          },
          {
            question: "How are SNS registration fees calculated?",
            answer: (
              <div>
                <p>SNS registration fees consist of:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Inscription fee: Cost to inscribe the name</li>
                  <li>Network fee: Bitcoin transaction fee (varies with network congestion)</li>
                  <li>Service fee: Fee for the SNS service (typically 2000 sats)</li>
                </ul>
              </div>
            ),
            id: "sns-fees"
          }
        ]
      },
      {
        title: "Troubleshooting",
        id: "troubleshooting",
        questions: [
          {
            question: "My image looks different after inscription",
            answer: "This is normal if image optimization was enabled. The optimization process converts images to WebP format at approximately 46KB, which may result in some visual differences while maintaining good quality.",
            id: "image-different"
          },
          {
            question: "I can't connect to my Ordinals node",
            answer: (
              <div>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Check that your Ordinals node container is running (`docker ps`)</li>
                  <li>Verify that the container name matches the one configured in Ordinarinos</li>
                  <li>Make sure Docker networking is properly set up</li>
                  <li>Check that your Ordinals node API is accessible</li>
                </ul>
              </div>
            ),
            id: "cant-connect"
          },
          {
            question: "How do I check if my inscription was successful?",
            answer: (
              <div>
                <p>Successful inscriptions will show in the Inscription Status section with:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>A green "Success" badge</li>
                  <li>A transaction ID that you can copy</li>
                  <li>A link to view the inscription on the Ordinals explorer</li>
                </ul>
              </div>
            ),
            id: "check-success"
          },
          {
            question: "Why do some rare sats appear unavailable?",
            answer: "Rare satoshis have to meet specific criteria to be available for inscription. A satoshi may be unavailable if: it's already been spent, it's below the required maturity threshold, or it's not in a UTXO that your wallet can spend.",
            id: "unavailable-sats"
          },
          {
            question: "I received an \"insufficient funds\" error when inscribing",
            answer: "This typically means that your Ordinals wallet doesn't have enough Bitcoin to cover the cost of the satoshi being inscribed, the transaction fees, and any additional fees required. Deposit more Bitcoin to your Ordinals wallet address and try again.",
            id: "insufficient-funds"
          }
        ]
      },
      {
        title: "Administration & Maintenance",
        id: "admin",
        questions: [
          {
            question: "How is the file cache managed?",
            answer: "Ordinarinos manages a local file cache with a 5GB limit. Files are cached for future use to avoid reprocessing. You can manually clear individual files or the entire cache. The system automatically removes the oldest files when the cache limit is reached.",
            id: "cache-management"
          },
          {
            question: "Can I change the port Ordinarinos runs on?",
            answer: "Yes, the default port is 3500, but you can modify this in the `docker-compose.yml` file by changing the port mapping.",
            id: "change-port"
          },
          {
            question: "How do I update Ordinarinos?",
            answer: (
              <div>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>Download the latest release</li>
                  <li>Stop the running container: `docker-compose down`</li>
                  <li>Replace the existing files with the new release</li>
                  <li>Start the application: `docker-compose up -d`</li>
                </ol>
              </div>
            ),
            id: "update-ordinarinos"
          },
          {
            question: "How can I back up my inscription history?",
            answer: (
              <div>
                <p>The inscription history is stored in the application's database. To back it up:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-1">
                  <li>Stop the application: `docker-compose down`</li>
                  <li>Copy the database file (located in the data directory)</li>
                  <li>Store the backup in a safe location</li>
                  <li>Restart the application: `docker-compose up -d`</li>
                </ol>
              </div>
            ),
            id: "backup-history"
          }
        ]
      },
      {
        title: "Support & Resources",
        id: "support",
        questions: [
          {
            question: "Where can I get help?",
            answer: "For support, visit ordinarinos.com or contact support at support@ordinarinos.com.",
            id: "get-help"
          },
          {
            question: "Where can I report bugs or request features?",
            answer: "Please report bugs or request features through our GitHub repository or by contacting support directly.",
            id: "report-bugs"
          },
          {
            question: "Is there a community forum?",
            answer: "Yes, join our community on Discord or Telegram to connect with other users and get help. Links are available on our website.",
            id: "community-forum"
          }
        ]
      }
    ];
    
    setFaqContent(content);
    setIsLoading(false);
  }, []);
  
  // Filter questions based on search query
  const filteredFaqContent = faqContent.map(category => {
    const filteredQuestions = category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (typeof q.answer === 'string' && q.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    return {
      ...category,
      questions: filteredQuestions,
      hasMatches: filteredQuestions.length > 0
    };
  }).filter(category => category.hasMatches);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate("/")}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h1>
        </div>

        <div className="relative mb-8">
          <Input
            type="text"
            placeholder="Search for questions or answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400"></div>
          </div>
        ) : (
          <>
            {searchQuery && filteredFaqContent.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600 dark:text-gray-400">No results found for "{searchQuery}"</p>
                <p className="mt-2 text-gray-500 dark:text-gray-500">Try a different search term or browse all categories below.</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-orange-600 dark:text-orange-400"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {(searchQuery ? filteredFaqContent : faqContent).map((category) => (
                  <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-orange-50 dark:bg-gray-700/50 text-left"
                    >
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category.title}</h2>
                      {expandedCategory === category.id ? (
                        <ChevronUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      )}
                    </button>
                    
                    {(expandedCategory === category.id || searchQuery) && (
                      <div className="p-6">
                        <Accordion type="single" collapsible className="w-full">
                          {category.questions.map((item, index) => (
                            <AccordionItem key={item.id} value={item.id}>
                              <AccordionTrigger className="text-gray-800 dark:text-gray-200 font-medium text-left">
                                {item.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-gray-700 dark:text-gray-300">
                                {item.answer}
                              </AccordionContent>
                              {index < category.questions.length - 1 && (
                                <Separator className="my-4" />
                              )}
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Can't find what you're looking for? <a href="https://ordinarinos.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}