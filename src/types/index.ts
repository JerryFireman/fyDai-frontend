import { BigNumber } from 'ethers';

export interface IYieldSeries {
  name: string
  displayName: string;
  maturity: number;
  maturity_: Date;
  isMature: boolean;
  marketAddress: string;
  yDaiAddress: string;

  yDaiBalance_: number;
  yDaiBalance: BigNumber;

  symbol?:string;
  id?: string;
  currentValue?: any;
  seriesColor?: string;
  wethDebtDai?: BigNumber;
  wethDebtDai_?: number;
  wethDebtYDai?: BigNumber;
  wethDebtYDai_?: number;
  yieldAPR?: number;
  yieldAPR_?: string;
}

export interface ISeriesPosition {
}

export interface IUser {
  appPrefs: any;
  account?: string;
  ethBalance?: BigNumber;
  ethBalance_?: number;
  ethPosted?: BigNumber;
  ethPosted_?: number;
  totalDebtYDai?: BigNumber;
  totalDebtYDai_?: number;
  ethAvailable?:BigNumber;
  ethAvailable_?:BigNumber;
}

export interface IReducerAction {
  type:string,
  payload?:any,
}

export interface INotification {
  message: string;
  type?: string;
  callbackAction?: any;
  callbackCancel?: any;
  showFor?: number;
  position?: string;
  open?: boolean,
  timerMs?: number,
  fatalOpen?: boolean,
  fatalMsg?: string,
  pendingTxs?: any,
}

export interface IYieldAccount {}

export interface IMakerVault {}
