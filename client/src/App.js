import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import Voting from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import "./App.css";

class App extends Component {
  state = { web3: null, accounts: null, contract: null, arrayproposal: null, winnerid: null, whitelist: null};

  componentWillMount = async () => {
    try {
      // Récupérer le provider web3
      const web3 = await getWeb3();
  
      // Utiliser web3 pour récupérer les comptes de l’utilisateur (MetaMask dans notre cas) 
      const accounts = await web3.eth.getAccounts();

      // Récupérer l’instance du smart contract “Voting” avec web3 et les informations du déploiement du fichier (client/src/contracts/Whitelist.json)
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Voting.networks[networkId];
  
      const instance = new web3.eth.Contract(
        Voting.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Non-Ethereum browser detected. Can you please try to install MetaMask before starting.`,
      );
      console.error(error);
    }
  };

  runInit = async() => {
    const { contract } = this.state;
  
    // récupérer l array des proposition
    const arrayproposal = await contract.methods.getArrayOfProposals().call();
    // Mettre à jour le state 
    this.setState({ arrayproposal: arrayproposal });

    // récupérer la liste des comptes autorisés
    const whitelist = await contract.methods.getAddresses().call();
    // Mettre à jour le state 
    this.setState({ whitelist: whitelist });

    // récupérer la liste des comptes autorisés
    const winnerid = await contract.methods.getWinner().call();
    // Mettre à jour le state 
    this.setState({ winnerid : winnerid });
  }; 

  whitelist = async() => {
    const { accounts, contract} = this.state;
    const address = this.address.value;
    await contract.methods.isWhitelisted(address).send({from: accounts[0]});
    this.runInit();  
  }

  startproposal = async() => {
    const { accounts, contract} = this.state;    
    await contract.methods.startProposalRegistration().send({from: accounts[0]});
    
  }
  

  getarray = async() => {
    const { accounts, contract} = this.state;
    const proposal = this.proposal.value;
   
    await contract.methods.depositProposal(proposal).send({from: accounts[0]});
    // Récupérer la liste des comptes autorisés
    this.runInit();
  }

  endproposal = async() => {
    const { accounts, contract} = this.state;    
    await contract.methods.endProposalRegistration().send({from: accounts[0]});
    
  }

  startvote = async() => {
    const { accounts, contract} = this.state;    
    await contract.methods.startVotingSession().send({from: accounts[0]});
    
  }

  votefor = async() => {
    const { accounts, contract} = this.state;  
    const vote = this.vote.value;  
    await contract.methods.voteFor(vote).send({from: accounts[0]});
  }

  stopvote = async() => {
    const { accounts, contract} = this.state;    
    await contract.methods.endVotingSession().send({from: accounts[0]});
  }

  countedtailes = async() => {
    const { accounts, contract} = this.state;
    await contract.methods.countedVotes().send({from: accounts[0]});
  }
    

  winnerid = async() => {
    const {contract} = this.state;
    await contract.methods.getWinner().call();
    this.runInit();
  }
 

  render() {
    // on recupere les state 
    const { arrayproposal, whitelist, winnerid } = this.state;

    // pour visualiser l'uint ID des propositions
    let indexproposal = 0;
    
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div>
            <h2 className="text-center">Système de Vote</h2>
            <hr></hr>
            <br></br>
        </div>        

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Liste des comptes autorisés</strong></Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Table striped bordered hover>                  
                    <tbody>
                      {whitelist !== null && 
                        whitelist.map((b) => <tr><td>{b}</td></tr>)
                      }
                    </tbody>
                  </Table>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
            <Card.Body>
              <Form.Group controlId="formAddress">
                <Form.Control type="text" id="address" placeholder="Autoriser un nouveau compte (Only Admin)"
                ref={(input) => { this.address = input }}
                />
              </Form.Group>
              <Button onClick={ this.whitelist } variant="dark" > Autoriser </Button>
            </Card.Body>
          </Card>                                        
        </div>
     

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Ouvrir le dépot de proposition</strong>  (Only Admin)</Card.Header>
            <Card.Body>
          
              <Button onClick={ this.startproposal} variant="dark" > Démarer </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>


          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Liste des propositions</strong></Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Proposal ID // Description  // Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrayproposal !== null && 
                        arrayproposal.map((a) => <tr><td>#: {indexproposal++} / {a[0]} / {a[1]}</td></tr>)
                      }                     
                    </tbody>
                  </Table>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </div>
        <br></br>

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Déposer une proposition</strong></Card.Header>
            <Card.Body>
              <Form.Group controlId="proposal">
                <Form.Control type="text" id="address" placeholder="Ecrivez ici une description de vôtre proposition"
                ref={(input) => { this.proposal = input }}
                />
              </Form.Group>
              <Button onClick={ this.getarray } variant="dark" > Déposer </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Fermer le dépot de proposition</strong> (Only Admin)</Card.Header>
            <Card.Body>
          
              <Button onClick={ this.endproposal} variant="dark" > Stop </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>
        

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Démarrer la session de vote</strong> (Only Admin)</Card.Header>
            <Card.Body>
          
              <Button onClick={ this.startvote} variant="dark" > Démarer </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Voter</strong></Card.Header>
            <Card.Body>
              <Form.Group controlId="vote">
                <Form.Control type="text" id="uintVote" placeholder="#ID Proposal"
                ref={(input) => { this.vote = input }}
                />
              </Form.Group>
              <Button onClick={ this.votefor } variant="dark" > Voter </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Stopper la session de vote</strong> (Only Admin)</Card.Header>
            <Card.Body>
          
              <Button onClick={ this.stopvote} variant="dark" > Stop </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>
      
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Comptage des votes</strong> (Only Admin)</Card.Header>
            <Card.Body>
          
              <Button onClick={ this.countedtailes} variant="dark" > Compter </Button>
            </Card.Body>
          </Card>
          </div>
        <br></br>

        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Proposition gagnante</strong></Card.Header>            
            <Card.Body>          
              <Button onClick={ this.winnerid} variant="dark" > Compter </Button>
            </Card.Body>
            <Card.Body>
            <tbody>
                      {winnerid !== null && 
                        winnerid.map((a) => <tr><td>{a}</td></tr>)
                      }
                    </tbody>
            </Card.Body>
          </Card>
          </div>
        <br></br>
      

      </div>

    );
  }
}

export default App;