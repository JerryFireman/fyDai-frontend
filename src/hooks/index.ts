/* Connection hook web3React */
import { useWeb3React } from '@web3-react/core';
import { useConnectorImage, useSignerAccount, useConnection } from './connectionHooks';

/* General app hooks */
import { useCachedState, useDebounce, useTxActive, useIsLol } from './appHooks';
import { useEvents } from './eventHooks';

/* Utility hooks */
import { useMath } from './mathHooks';  // TODO work out this cyclic reference (not critical)
import { useAuth } from './authsHook';

/* Generic blockchain transactional hooks */
import { useCallTx, useSendTx, useTimeTravel } from './chainHooks'; 
import { useToken } from './tokenHook';

/* Contract hooks */
import { useMigrations } from './migrationHook';
import { useController } from './controllerHook';
import { useProxy } from './yieldProxyHook';
import { usePool } from './poolHook';
import { useFyDai } from './fyDaiHook';

export {
  usePool,
  useTxActive,
  useCachedState,
  useDebounce,
  useSendTx,
  useCallTx,
  useIsLol,

  useAuth,
  useProxy,
  useController,
  useFyDai,
  useMigrations,

  useEvents,
  useMath,
  useToken,

  useWeb3React,
  useConnectorImage,
  
  useSignerAccount, 
  useConnection,

  useTimeTravel, 
};