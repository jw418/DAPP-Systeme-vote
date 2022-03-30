// test du SC Voting.sol

const Voting = artifacts.require('./Voting');
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const constants = require('@openzeppelin/test-helpers/src/constants');


contract('Voting', function (accounts) {
    const owner = accounts[0];
    const votant1 = accounts[1];
    const votant2 = accounts[2];
    const votantNotWhitelisted = accounts[10];

    beforeEach(async function () {
        this.VotingInstance = await Voting.new({ from: owner });
        // const Voting = await Voting.deployed(); // autre facon de faire. quell diff entre les 2??

    });


    // test de la fonction renounceOwnership
    it('renounceOwnership should have a revert', async function () {
        expectRevert.unspecified(this.VotingInstance.renounceOwnership({ from: votant1 }));
    });

    // test de la fonction transferOwnership 
    it('transferOwnership should have a revert', async function () {
        expectRevert.unspecified(this.VotingInstance.transferOwnership(votant1, { from: votant1 }))
    });



    // les test pour la fct isWhitelisted    
    it('Should have an event: add a voter(address) on the whitelist', async function () {
        const result = await this.VotingInstance.isWhitelisted(votant1, { from: owner }); // le owner est précisé ici mais par défault les fonctions sont appeler par le owner
        expectEvent(result, 'VoterRegistered', { voterAddress: votant1 })
    });

    // autre facon de faire
    //it('Should have an event: add a voter(address) on the whitelist', async function() {        
    //    const result = await this.VotingInstance.isWhitelisted(votant1, {from: accounts[0]});
    //    assert.equal(result.logs[0].args.voterAddress, votant1,
    //     "you did not add an address to the whitelist");
    //});

    
    // on vérifie bien que l'etat isRegisterd est bien sur false quand le contrat est deployé
    it('the voter should be isRegistered = false', async function () {
        const voter = await this.VotingInstance.voters(votant1);
        await expect(voter.isRegistered).to.equal(false, "isRegitered is not true");
    });

    // on ajoute un votant a la WL et on verifie que c'est bien effectif    
    it('the voter should be isRegistered = true', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        const voter = await this.VotingInstance.voters(votant1);
        await expect(voter.isRegistered).to.equal(true, "isRegitered is not true");
    });

    it('should have a revert: not the owner', async function () {
        await expectRevert(this.VotingInstance.isWhitelisted(votant1, { from: votant2 }), 'Ownable: caller is not the owner')
    });

    it('should have a revert: already on the WitheList', async function () {
        // enregistré ici le compte 1 sur la wl 
        await this.VotingInstance.isWhitelisted(votant1);
        await expectRevert(this.VotingInstance.isWhitelisted(votant1), 'This voters is already registered')
    });

    it('isWhitelisted should have a revert: not the correct current status', async function () {
        await this.VotingInstance.startProposalRegistration();
        await expectRevert(this.VotingInstance.isWhitelisted(votant1), 'the registration period for the whitelist is over')
    });

    // les test pour la fonction startProposalRegistartion
    it('should start proposal registration', async function () {
        const startProposal = await this.VotingInstance.startProposalRegistration();
        await expectEvent(startProposal, 'WorkflowStatusChange', {
            previousStatus: '0',
            newStatus: '1'
        });
    });
    it('startProposalRegistartion should have a revert: not the correct current status', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration(); // on se mets ici à l'etape d'apres dans le workflow
        // on vérifie que le retour en arriere n'est pas possible
        await expectRevert(this.VotingInstance.startProposalRegistration(), 'the current workflow status does not allow you to start registering proposals')
    });
    it('startProposalRegistartion should have a revert: not the owner', async function () {
        await expectRevert(this.VotingInstance.startProposalRegistration({ from: votant1 }), 'Ownable: caller is not the owner')
    });

   
    // les tests pour la fonction depositProposal
    it('should emit ProposalRegistered et son uint associé', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        await this.VotingInstance.startProposalRegistration();
        const depot = await this.VotingInstance.depositProposal('Do an airdrop', { from: votant1 });
        await expectEvent(depot, 'ProposalRegistered', { proposalId: '0' });
    });
   
    it('deposit proposal should revert not whitelisted', async function () {
        await this.VotingInstance.startProposalRegistration();
        await expectRevert(this.VotingInstance.depositProposal('increase fees', { from: votantNotWhitelisted }), 'this address is not whitelisted');
    });
   
    it('deposit proposal should have a revert: not the correct current status', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration(); // on se mets ici à l'etape d'apres dans le workflow
        // on vérifie que le vote ne soit pas possible 
        await expectRevert(this.VotingInstance.depositProposal('Do an airdrop', { from: votant1 }), 'registration of proposals is not already open or already close');
    });

    // les test pour la fonction getArrayOfProposals



    // les tests pour la fonction endProposalRegistration
    it('should stop proposal registration', async function () {
        await this.VotingInstance.startProposalRegistration();
        const stopProposal = await this.VotingInstance.endProposalRegistration();
        await expectEvent(stopProposal, 'WorkflowStatusChange', {
            previousStatus: '1',
            newStatus: '2'
        });
    });
    
    it('endProposalRegistartion should have a revert: not the correct current status', async function () {
        // ici on est par default à l'étape RegisteringVoters dans le workflow                
        // on vérifie que sauté une étape dans le worflow n'est pas possible
        await expectRevert(this.VotingInstance.endProposalRegistration(), 'the current workflow status does not allow you to stop registering proposals')
    });
    
    it('endProposalRegistartion should have a revert: not the owner', async function () {
        await this.VotingInstance.startProposalRegistration();
        await expectRevert(this.VotingInstance.endProposalRegistration({ from: votant1 }), 'Ownable: caller is not the owner')
    });

    // les test pour la fonction startVotingSession
    it('should start voting session', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration();
        const startVote = await this.VotingInstance.startVotingSession();
        await expectEvent(startVote, 'WorkflowStatusChange', {
            previousStatus: '2',
            newStatus: '3'
        });
    });
    
    it('startVotingSession should have a revert: not the correct current status', async function () {
        // ici on est par default à l'étape RegisteringVoters dans le workflow                
        // on vérifie que sauté plusieurs étapes dans le worflow n'est pas possible
        await expectRevert(this.VotingInstance.startVotingSession(), 'the current workflow status does not allow you to start voting session')
    });
    
    it('startVotingSession should have a revert: not the owner', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration();
        await expectRevert(this.VotingInstance.startVotingSession({ from: votant1 }), 'Ownable: caller is not the owner')
    });

    // les tests pour la fonction voteFor
    it('should emit a event Voted associated with the address voter and the proposal ID', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.depositProposal('Do an airdrop', { from: votant1 });
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        const voted = await this.VotingInstance.voteFor(0, { from: votant1 });
        await expectEvent(voted, 'Voted', {
            voter: votant1,
            proposalId: '0'
        })
    }),
        it('voteFor should revert: not whitelisted', async function () {
            await this.VotingInstance.isWhitelisted(owner);
            await this.VotingInstance.startProposalRegistration();
            await this.VotingInstance.depositProposal('Do an airdrop', { from: owner });
            await this.VotingInstance.endProposalRegistration();
            await this.VotingInstance.startVotingSession();
            await expectRevert(this.VotingInstance.voteFor(0, { from: votant1 }), 'this address is not whitelisted');
        });
   
        it('voteFor should revert: not correct status', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.depositProposal('Do an airdrop', { from: votant1 });
        await this.VotingInstance.endProposalRegistration();
        await expectRevert(this.VotingInstance.voteFor(0, { from: votant1 }), 'the current workflow status does not allow you to vote');
    });
    
    it('voteFor should revert: this address has already voted', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.depositProposal('Do an airdrop', { from: votant1 });
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        await this.VotingInstance.voteFor(0, { from: votant1 });
        await expectRevert(this.VotingInstance.voteFor(0, { from: votant1 }), 'this address has already voted');
    });
    
    it('voteFor should revert: this proposal does not exist', async function () {
        await this.VotingInstance.isWhitelisted(votant1);
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.depositProposal('Do an airdrop', { from: votant1 });
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        // onvote pour la propositions 15 qui n'exsite pas
        await expectRevert(this.VotingInstance.voteFor(15, { from: votant1 }), 'this proposal does not exsit');
    });

    // les tests pour la fonction endVotingSession
    it('should stop voting session', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        const stopVote = await this.VotingInstance.endVotingSession()
        await expectEvent(stopVote, 'WorkflowStatusChange', {
            previousStatus: '3',
            newStatus: '4'
        });
    });
    
    it('endVotingSession should have a revert: not the correct current status', async function () {
        // ici on est par default à l'étape RegisteringVoters dans le workflow                
        // on vérifie que sauté plusieurs étapes dans le worflow n'est pas possible
        await expectRevert(this.VotingInstance.endVotingSession(), 'the current workflow status does not allow you to stop voting session')
    });
   
    it('endVotingSession should have a revert: not the owner', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        await expectRevert(this.VotingInstance.endVotingSession({ from: votant1 }), 'Ownable: caller is not the owner')
    });


    // les test pour la fonction countedVotes        
    it('should change the status to votesTallied', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        await this.VotingInstance.endVotingSession()
        const toVotesTailled = await this.VotingInstance.countedVotes();
        await expectEvent(toVotesTailled, 'WorkflowStatusChange', {
            previousStatus: '4',
            newStatus: '5'
        });
    });
    
    it('countedVotes should have a revert: not the correct current status', async function () {
        // ici on est par default à l'étape RegisteringVoters dans le workflow                
        // on vérifie que sauté plusieurs étapes dans le worflow n'est pas possible
        await expectRevert(this.VotingInstance.countedVotes(), 'the current workflow status does not allow you to counted the votes')
    });
    
    it('countedVotes should have a revert: not the owner', async function () {
        await this.VotingInstance.startProposalRegistration();
        await this.VotingInstance.endProposalRegistration();
        await this.VotingInstance.startVotingSession();
        await this.VotingInstance.endVotingSession();
        await expectRevert(this.VotingInstance.countedVotes({ from: votant1 }), 'Ownable: caller is not the owner')
    });

    // les test de la fonction getWinner
})