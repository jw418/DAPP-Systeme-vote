// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedProposalId;
    }

    struct Proposal {
        string description;
        uint256 voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public currentStatus = WorkflowStatus.RegisteringVoters;

    mapping(address => Voter) public voters;
    Proposal[] public proposals;
    uint256 public numberOfProposals;
    uint256 winningProposalId;

    
    event VoterRegistered(address voterAddress);    
    event WorkflowStatusChange(WorkflowStatus previousStatus,
    WorkflowStatus newStatus);
    event ProposalRegistered(uint256 proposalId);    
    event Voted(address voter, uint256 proposalId);

    
    
    function isWhitelisted(address _address) external onlyOwner {                
        require(currentStatus == WorkflowStatus.RegisteringVoters,"the registration period for the whitelist is over");
        require(!voters[_address].isRegistered,"This voters is already registered");
        
        voters[_address].isRegistered = true;
        
        emit VoterRegistered(_address);
    }


    function startProposalRegistration() external onlyOwner {
        require(currentStatus == WorkflowStatus.RegisteringVoters,"the current workflow status does not allow you to start registering proposals");
        
        currentStatus = WorkflowStatus.ProposalsRegistrationStarted;
        
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }


    function depositProposal(string calldata _proposal) external {
        require(voters[msg.sender].isRegistered == true, "this address is not whitelisted");
        require(currentStatus == WorkflowStatus.ProposalsRegistrationStarted, 
        "registration of proposals is not already open or already close");

        proposals.push(Proposal({description: _proposal, voteCount: 0}));

        emit ProposalRegistered(numberOfProposals);
        numberOfProposals += 1;
    }

    function getArrayOfProposals() external view returns (Proposal[] memory) {
        Proposal[] memory arrayOfProposals = new Proposal[](proposals.length);
        for (uint256 i = 0; i < proposals.length; i++) {
            arrayOfProposals[i] = proposals[i];
        }
        return arrayOfProposals;
    }

    function endProposalRegistration() external onlyOwner {
        require(currentStatus == WorkflowStatus.ProposalsRegistrationStarted,
        "the current workflow status does not allow you to stop registering proposals"
        );
        currentStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() external onlyOwner {
        require(currentStatus == WorkflowStatus.ProposalsRegistrationEnded, "the current workflow status does not allow you to start voting session");
        currentStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            WorkflowStatus.VotingSessionStarted
        );
    }

    function voteFor(uint256 _proposalId) external {
        require(voters[msg.sender].isRegistered == true, "this address is not whitelisted");
        require(currentStatus == WorkflowStatus.VotingSessionStarted, "the current workflow status does not allow you to vote");
        require(!voters[msg.sender].hasVoted, "this address has already voted");
        require(_proposalId <= numberOfProposals, "this proposal does not exsit");

        proposals[_proposalId].voteCount += 1;
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;

        emit Voted(msg.sender, _proposalId);
    }


    function endVotingSession() external onlyOwner {
        require(currentStatus == WorkflowStatus.VotingSessionStarted, "the current workflow status does not allow you to stop voting session");
        currentStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            WorkflowStatus.VotingSessionEnded
        );
    }


    function countedVotes() external onlyOwner {
        require(currentStatus == WorkflowStatus.VotingSessionEnded, "the current workflow status does not allow you to counted the votes");

        uint256 voteMax;

        for (uint256 i = 0; i < proposals.length; i++) {
            // simplification, ne prends pas en compte la possibilité d'une égalié
            if (proposals[i].voteCount > voteMax) {
                voteMax = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        currentStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    function getWinner() external view returns (string memory, uint256) {
        require(currentStatus == WorkflowStatus.VotesTallied,"the current workflow status does not allow you to get the winner");
        return (proposals[winningProposalId].description,proposals[winningProposalId].voteCount);
    }
}