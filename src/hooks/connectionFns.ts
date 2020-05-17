import React from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers }  from 'ethers'; 
import { injected, trezor, walletlink, torus } from '../connectors';


import injectedImage from '../assets/images/metamask.png';
import trezorImage from '../assets/images/trezor.png';
import walletlinkImage from '../assets/images/walletlink.png';
import torusImage from '../assets/images/torus.png';
import noConnectionImage from '../assets/images/noconnection.png';

export async function useGetWeiBalance() {
  const web3React = useWeb3React();
  const { library, account } = web3React;
  if (!!library && !!account) {
    const bal = await library.getBalance(account);
    return bal.toString();
  }
  return '-';
}

// eager connect is an attempt to 'auto connect' to injected connection eg. Metamask.
export function useEagerConnect() {
  const { activate, active } = useWeb3React();
  const [tried, setTried] = React.useState(false);
  React.useEffect(() => {
    injected.isAuthorized().then((isAuthorized: boolean) => {
      if (isAuthorized) {
        activate(injected, undefined, true).catch(() => {
          setTried(true);
        });
      } else {
        setTried(true);
      }
    });
  }, [activate]);
  // if the connection worked, wait until we get confirmation of that to flip the flag
  React.useEffect(() => {
    if (!tried && active) {
      setTried(true);
    }
  }, [tried, active]);
  return tried;
}

export function useConnectorImage() {
  const { connector } = useWeb3React();
  const [image, setImage] = React.useState<any>();
  React.useEffect(() => {
    switch (connector) {
      case injected:
        setImage(injectedImage);
        break;
      case trezor:
        setImage(trezorImage);
        break;
      case walletlink:
        setImage(walletlinkImage);
        break;
      case torus:
        setImage(torusImage);
        break;
      default:
        setImage(noConnectionImage);
    }
  }, [connector]);
  return image;
}

export function getNetworkName(networkId: Number) {
  switch (networkId) {
    case 1: {
      return 'Main Ethereum Network';
    }
    case 3: {
      return 'Ropsten Test Network';
    }
    case 4: {
      return 'Rinkeby Test Network';
    }
    case 5: {
      return 'Görli Test Network';
    }
    case 42: {
      return 'Kovan Test Network';
    }
    case 1337: {
      return 'Ganache Localhost';
    }
    default: {
      return '..ummm...';
    }
  }
}


export const useSendTx = () => {

  const { library } = useWeb3React();

  const signer = library && library.getSigner(); 

  const transaction = {
    nonce: 0,
    gasLimit: 21000,
    gasPrice: ethers.utils.bigNumberify('20000000000'),
    to: '0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290',
    // ... or supports ENS names
    // to: "ricmoo.firefly.eth",
    value: ethers.utils.parseEther('1.0'),
    data: '0x',
    // This ensures the transaction cannot be replayed on different networks
    chainId: ethers.utils.getNetwork('homestead').chainId
  };

  const logSigner = () => console.log(signer);

  const sendTx = () => {
    signer && signer.sendTransaction(transaction);
  };

  return sendTx;

  // // signer && signer.sendTransaction(transaction).then(console.log);
  // return signer.sendTransaction(transaction);

  // const signedTransaction = transaction;
  // library.provider.sendTransaction(signedTransaction).then((tx:any) => {
  // console.log(tx);
  // {
  //    // These will match the above values (excluded properties are zero)
  //    "nonce", "gasLimit", "gasPrice", "to", "value", "data", "chainId"
  //
  //    // These will now be present
  //    "from", "hash", "r", "s", "v"
  //  }
  // Hash:
  // });

};

