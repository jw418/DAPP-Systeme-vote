// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;
import "../client/node_modules/@openzeppelin/contracts/access/Ownable.sol";

/// @title Systeme de Vote
/// @author jw418
/// @notice You can use this contract for only the most basic simulation
/// @dev seul le owner peut ajouter des addresses a la WL ou changer le workflow status.
/// @custom:experimental This is an experimental contract.(Formation Digitt)
contract Voting is Ownable {

    struct Voter {
        bool isRegistered;  // if true, that person already on the whitelist
        bool hasVoted;  // if true, that person already voted
        uint256 votedProposalId;  // index of the voted proposal
    }

    struct Proposal {
        string description;  // descripton de la proposition
        uint256 voteCount; //  number of accumulated votes
    }

    /// @dev le workflow status ne va que dans un seul sens (pas de boucle possible)
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    /// @dev on met le workflow statut sur l etape 1
    WorkflowStatus public currentStatus = WorkflowStatus.RegisteringVoters;

    mapping(address => Voter) public voters;
    mapping(address=> bool) public _whitelist;
    address[] public addresses;
    Proposal[] public proposals;
    uint256 public numberOfProposals;
    uint256 public winnerId;

    // les event pour transmettre au front
    event VoterRegistered(address voterAddress);    
    event WorkflowStatusChange(WorkflowStatus previousStatus,
    WorkflowStatus newStatus);
    event ProposalRegistered(uint256 proposalId);    
    event Voted(address voter, uint256 proposalId);

    
    /// @notice pour ajouter des addresses a la WL
    /// @param _address address a ajouté a la WL
    function isWhitelisted(address _address) external onlyOwner {                
        require(currentStatus == WorkflowStatus.RegisteringVoters,"the registration period for the whitelist is over");
        require(!voters[_address].isRegistered,"This voters is already registered");
        
        voters[_address].isRegistered = true;
        addresses.push(_address);
        
        emit VoterRegistered(_address);
    }

    /// @notice obtenir la liste des adresses sur la WL
    function getAddresses() public view returns(address[] memory){
        return addresses;
    }

    /// @notice pour demarrer l'enregistrement des propositions
    /// @dev une fois la fonction appelée le statut change, on ne peut donc plus ajouter d addreses a la WL!!
    function startProposalRegistration() external onlyOwner {
        require(currentStatus == WorkflowStatus.RegisteringVoters,"the current workflow status does not allow you to start registering proposals");
        
        currentStatus = WorkflowStatus.ProposalsRegistrationStarted;
        
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    /// @notice pour déposer des propositions
    /// @param _proposal string qui contient la description de la proposition
    function depositProposal(string calldata _proposal) external {
        require(voters[msg.sender].isRegistered == true, "this address is not whitelisted");
        require(currentStatus == WorkflowStatus.ProposalsRegistrationStarted, 
        "registration of proposals is not already open or already close");

        proposals.push(Proposal({description: _proposal, voteCount: 0}));

        emit ProposalRegistered(numberOfProposals);
        numberOfProposals += 1;
    }
     /// @notice pour obtenir la liste des propositions et l'id associé
     /// @return  arrayOfProposals tableau avec les propositions et leur id associés
    function getArrayOfProposals() external view returns (Proposal[] memory) {
        Proposal[] memory arrayOfProposals = new Proposal[](proposals.length);
        for (uint256 i = 0; i < proposals.length; i++) {
            arrayOfProposals[i] = proposals[i];
        }
        return arrayOfProposals;
    }
     /// @notice pour stoper l'enregistrement des propositions
    function endProposalRegistration() external onlyOwner {
        require(currentStatus == WorkflowStatus.ProposalsRegistrationStarted,
        "the current workflow status does not allow you to stop registering proposals"
        );
        currentStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /// @notice pour demarrer la session de vote 
    function startVotingSession() external onlyOwner {
        require(currentStatus == WorkflowStatus.ProposalsRegistrationEnded, "the current workflow status does not allow you to start voting session");
        currentStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            WorkflowStatus.VotingSessionStarted
        );
    }

     /// @notice pour voter
     /// @param _proposalId uint pour laquelle le votant vote
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

     /// @notice met fin a la session de vote
    function endVotingSession() external onlyOwner {
        require(currentStatus == WorkflowStatus.VotingSessionStarted, "the current workflow status does not allow you to stop voting session");
        currentStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            WorkflowStatus.VotingSessionEnded
        );
    }

     /// @notice lance le comptage du vote
    function countedVotes() external onlyOwner {
        require(currentStatus == WorkflowStatus.VotingSessionEnded, "the current workflow status does not allow you to counted the votes");

        uint256 voteMax;

        for (uint256 i = 0; i < proposals.length; i++) {
            // simplification, ne prends pas en compte la possibilité d'une égalié
            if (proposals[i].voteCount > voteMax) {
                voteMax = proposals[i].voteCount;
                winnerId = i;
            }
        }
        currentStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
     /// @notice pour obtenir la proposition gagnante
     /// @return  winnerIdAndDescription 
    function getWinner() external view returns (uint256) {
        require(currentStatus == WorkflowStatus.VotesTallied,"the current workflow status does not allow you to get the winner");
        return winnerId;
    }
}
