
import { useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import VotingArtifact from "./VotingArtifact.json";
import "./App.css";

const CONTRACT_ADDRESS =
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const ABI = VotingArtifact.abi;

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setMessage("MetaMask not detected. Open this site in Chrome.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();

      if (network.chainId !== 31337n) {
        setMessage("Switch MetaMask to Hardhat Local, Chain ID 31337.");
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const voting = new Contract(CONTRACT_ADDRESS, ABI, signer);

      setAccount(address);
      setContract(voting);
      setMessage("Wallet connected. Loading candidates...");

      await loadData(voting, address);
    } catch (error) {
      console.error(error);
      setMessage(error.shortMessage || error.message);
    }
  }

  async function loadData(voting, address) {
    try {
      const list = await voting.getCandidates();

      setCandidates(
        list.map((c) => ({
          id: Number(c.id),
          name: c.name,
          voteCount: Number(c.voteCount),
        }))
      );

      setHasVoted(await voting.hasVoted(address));
      setEnded(await voting.votingEnded());
      setMessage("Blockchain data loaded successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not load contract data: " + error.message);
    }
  }

  async function castVote(candidateId) {
    if (!contract || hasVoted || ended || busy) return;

    try {
      setBusy(true);
      setMessage("Confirm the vote transaction in MetaMask.");

      const tx = await contract.vote(candidateId);

      setMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      await loadData(contract, account);
      setMessage("Vote recorded successfully on the blockchain!");
    } catch (error) {
      console.error(error);
      setMessage(
        error.reason || error.shortMessage || error.message
      );
    } finally {
      setBusy(false);
    }
  }

  async function endElection() {
    if (!contract || ended || busy) return;

    try {
      setBusy(true);
      setMessage("Confirm ending the election in MetaMask.");

      const tx = await contract.endElection();
      await tx.wait();

      await loadData(contract, account);
      setMessage("Election ended.");
    } catch (error) {
      console.error(error);
      setMessage(error.reason || error.shortMessage || error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a className="brand" href="#">
          <span className="brand-icon">V</span>
          VoteChain
        </a>

        <button className="wallet-btn" onClick={connectWallet}>
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </nav>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="live-dot" />
            BLOCKCHAIN-POWERED ELECTION
          </div>

          <h1>
            Your Voice.
            <br />
            <span>Your Vote.</span>
          </h1>

          <p>
            Cast a test vote using a Solidity smart contract
            on your local Ethereum blockchain.
          </p>

          <div className="status">
            {ended ? "Election ended" : "Election status: Open"}
          </div>
        </section>

        <section className="election-heading">
          <div>
            <p className="section-label">CAST YOUR VOTE</p>
            <h2>Meet the Candidates</h2>
            <p className="muted">
              Connect your wallet to submit a blockchain vote.
            </p>
          </div>

          <span className="candidate-count">
            {candidates.length} Candidates
          </span>
        </section>

        <section className="candidate-grid">
          {candidates.map((candidate) => (
            <article className="candidate-card" key={candidate.id}>
              <div className="candidate-avatar">
                {candidate.name.charAt(0)}
              </div>

              <span className="candidate-role">
                Candidate {String(candidate.id).padStart(2, "0")}
              </span>

              <h3>{candidate.name}</h3>
              <p className="muted">
                Votes: {candidate.voteCount}
              </p>

              <button
                className="vote-btn"
                onClick={() => castVote(candidate.id)}
                disabled={!account || hasVoted || ended || busy}
              >
                {busy
                  ? "Processing..."
                  : hasVoted
                  ? "Already Voted"
                  : ended
                  ? "Election Ended"
                  : "Vote"}
              </button>
            </article>
          ))}
        </section>

        <section className="notice">
          <strong>
            {account ? "Wallet connected" : "Connect your wallet to begin"}
          </strong>
          <p>{message || "Connect MetaMask to load blockchain candidates."}</p>

          {account && !ended && (
            <button
              className="vote-btn"
              onClick={endElection}
              disabled={busy}
            >
              End Election (Owner Only)
            </button>
          )}
        </section>

        <footer>
          <span>VoteChain · BCT Mini Project</span>
          <span>React · ethers.js · Solidity</span>
        </footer>
      </main>
    </div>
  );
}

export default App;