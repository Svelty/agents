import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = "https://api.coingecko.com/api/v3/";
const API_KEY = process.env.COIN_GEKO_API_KEY;

const fetchCoinGekoData = async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        //@ts-ignore
        headers: {
            "x-cg-demo-api-key": API_KEY,
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
};

export const ping = () => {
    return fetchCoinGekoData("ping");
};

export const listCoins = () => {
    //?include_platform=true
    return fetchCoinGekoData("/coins/list");
};
// [
//     { id: '_', symbol: 'gib', name: '༼ つ ◕_◕ ༽つ' },
//     { id: '01coin', symbol: 'zoc', name: '01coin' },
//     { id: '0chain', symbol: 'zcn', name: 'Zus' },
//     { id: '0dog', symbol: '0dog', name: 'Bitcoin Dogs' },
//     {
//       id: '0-knowledge-network',
//       symbol: '0kn',
//       name: '0 Knowledge Network'
//     },
//     { id: '0-mee', symbol: 'ome', name: 'O-MEE' },
//     { id: '0vix-protocol', symbol: 'vix', name: '0VIX Protocol' },
//     { id: '0x', symbol: 'zrx', name: '0x Protocol' },
//     {
//       id: '0x0-ai-ai-smart-contract',
//       symbol: '0x0',
//       name: '0x0.ai: AI Smart Contract'
//     },
//     { id: '0x678-landwolf-1933', symbol: 'wolf', name: 'Landwolf' },
//     { id: '0xcoco', symbol: 'coco', name: '0xCoco' },
//     { id: '0xgasless-2', symbol: '0xgas', name: '0xGasless' },
//     { id: '0xgen', symbol: 'xgn', name: '0xGen' },
//     { id: '0x-leverage', symbol: 'oxl', name: '0x Leverage' },
//     { id: '0xlp', symbol: 'openli', name: 'OpenLiquidity' },
//     { id: '0xlsd', symbol: '0xlsd', name: '0xLSD' },
//     { id: '0xmonk', symbol: 'monk', name: '0xMonk by Virtuals' },
//     { id: '0xnumber', symbol: 'oxn', name: '0xNumber' },
//     { id: '0xprivacy', symbol: '0xp', name: '0xPrivacy' },
//     { id: '0xscans', symbol: 'scan', name: '0xScans' },
//     {
//       id: '0xsim-by-virtuals',
//       symbol: 'sage',
//       name: '0xsim by Virtuals'
//     },
//     { id: '1000bonk', symbol: '1000bonk', name: '1000BONK' },
//     { id: '1000btt', symbol: '1000btt', name: '1000BTT' },
//     { id: '1000cat', symbol: '1000cat', name: '1000CAT' },
//     { id: '1000chems', symbol: '1000cheems', name: '1000CHEMS' },
//     { id: '1000rats', symbol: '1000rats', name: '1000RATS' },
//     {
//       id: '1000sats-ordinals',
//       symbol: '1000sats',
//       name: '1000SATS (Ordinals)'
//     },
//     { id: '1000shib', symbol: '1000shib', name: '1000SHIB' },
//     { id: '1000troll', symbol: '1000troll', name: '1000TROLL' },
//     {
//       id: '1000x-by-virtuals',
//       symbol: '1000x',
//       name: '1000x by Virtuals'
//     },
//     { id: '10-figs', symbol: 'figs', name: '10 figs' },
//     { id: '1900rugrat', symbol: 'rugrat', name: '1900Rugrat' },
//     { id: '1984-token', symbol: '1984', name: '1984' },
//     { id: '1art', symbol: '1art', name: 'OneArt' },
//     { id: '1-dollar-sol-coin', symbol: '$1', name: '$1' },
//     { id: '1ex', symbol: '1ex', name: '1ex' },
//     { id: '1guy', symbol: '1guy', name: '1GUY' },
//     { id: '1hive-water', symbol: 'water', name: '1Hive Water' },
//     { id: '1hub-ai', symbol: '1hub', name: '1Hub.ai' },
//     { id: '1inch', symbol: '1inch', name: '1inch' },
//     { id: '1inch-yvault', symbol: 'yv1inch', name: '1INCH yVault' },
//     { id: '1intro', symbol: 'chef', name: 'CoinChef' },
//     { id: '1mbabydoge', symbol: '1mbabydoge', name: '1MBABYDOGE' },
//     { id: '1mdc', symbol: '1mdc', name: '1MDC' },
//     { id: '1million-nfts', symbol: '1mil', name: '1MillionNFTs' },
//     { id: '1move token', symbol: '1mt', name: '1Move Token' },
//     { id: '1-percent', symbol: '1%', name: '1%' },
//     { id: '1reward-token', symbol: '1rt', name: '1Reward Token' },
//     { id: '1rus-btc25', symbol: '@btc25', name: '@BTC25' },
//     { id: '1rus-dao', symbol: '1rusd', name: '1RUS DAO' },
//     { id: '1sol', symbol: '1sol', name: '1Sol' },
//     { id: '1-squirrel', symbol: 'peanut', name: 'OG Peanut' },
//     { id: '2024pump', symbol: 'pump', name: '2024PUMP' },
//     { id: '2025-token', symbol: '2025', name: '2025 TOKEN' },
//     { id: '2077-code', symbol: '2077', name: '2077 CODE' },
//     { id: '2080', symbol: '2080', name: '2080' },
//     { id: '20ex', symbol: '20ex', name: '20EX' },
//     { id: '21million', symbol: '21m', name: '21Million' },
//     { id: '21x', symbol: '21x', name: '21X Diamonds' },
//     { id: '23-turtles', symbol: 'ai23t', name: '23 Turtles' },
//     { id: '28vck', symbol: 'vck', name: '28VCK' },
//     { id: '2dai-io', symbol: '2dai', name: '2DAI.io' },
//     { id: '2g-carbon-coin', symbol: '2gcc', name: '2G Carbon Coin' },
//     { id: '2moon', symbol: 'moon', name: '2MOON' },
//     { id: '-3', symbol: 'meow', name: 'Meow Meow Coin' },
//     {
//       id: '360noscope420blazeit',
//       symbol: 'mlg',
//       name: '360noscope420blazeit'
//     },
//     { id: '39a-fun', symbol: '39a', name: '39a.fun' },
//     { id: '3a-lending-protocol', symbol: 'a3a', name: '3A' },
//     { id: '3d3d', symbol: '3d3d', name: '3d3d' },
//     { id: '3dpass', symbol: 'p3d', name: '3DPass' },
//     {
//       id: '3-kingdoms-multiverse',
//       symbol: '3km',
//       name: '3 Kingdoms Multiverse'
//     },
//     { id: '3space-art', symbol: 'pace', name: '3SPACE ART' },
//     { id: '4', symbol: 'four', name: '4' },
//     { id: '-4', symbol: '🤡', name: '🤡' },
//     { id: '404ver', symbol: 'top', name: '404ver' },
//     {
//       id: '4-2-aminoethyl-benzene-1-2-diol',
//       symbol: 'dopamine',
//       name: '4-(2-Aminoethyl)benzene-1,2-diol'
//     },
//     { id: '42-coin', symbol: '42', name: '42-coin' },
//     { id: '4444-token', symbol: '4444', name: '4444' },
//     { id: '4547-token', symbol: '4547', name: '4547' },
//     { id: '47th-potus', symbol: 'trump47', name: '47th POTUS' },
//     { id: '4chan', symbol: '4chan', name: '4Chan' },
//     { id: '4d-twin-maps-2', symbol: '4dmaps', name: '4D Twin Maps' },
//     { id: '4everland', symbol: '4ever', name: '4EVERLAND' },
//     { id: '4gentic', symbol: '4gs', name: '4GENTIC' },
//     { id: '4-next-unicorn', symbol: 'nxtu', name: '4 Next Unicorn' },
//     { id: '4tb-coin', symbol: '4tb', name: '4TB Coin' },
//     { id: '4trump', symbol: '4win', name: '4TRUMP' },
//     {
//       id: '4-way-mirror-money',
//       symbol: '4wmm',
//       name: '4-Way Mirror Money'
//     },
//     { id: '-5', symbol: '🟥🟩', name: '🟥🟪🟦🟩🟨🟧' },
//     { id: '589-token', symbol: '589', name: '589' },
//     { id: '5g-cash', symbol: 'vgc', name: '5G-CASH' },
//     { id: '5ire', symbol: '5ire', name: '5ire' },
//     { id: '5mc', symbol: '5mc', name: '5mc' },
//     { id: '5tars', symbol: '5tars', name: '5TARS' },
//     { id: '5th-scape', symbol: '$5scape', name: '5th Scape' },
//     { id: '-6', symbol: '"　"', name: '"　"' },
//     { id: '666-token', symbol: '666', name: '666' },
//     { id: '69420', symbol: '69420', name: '69420' },
//     { id: '69bird', symbol: 'brd', name: '69BIRD' },
//     { id: '-7', symbol: '∅', name: '∅' },
//     ... 16887 more items
//   ]

// coins/markets

//coins/:id

export const getCoinDataById = (id: string) => {
    return fetchCoinGekoData(`/coins/${id}`);
};

export const listCoinsWithMarketData = () => {
    //?include_platform=true
    return fetchCoinGekoData("/coins/markets?vs_currency=usd");
};

// {
//     id: 'solv-btc',
//     symbol: 'solvbtc',
//     name: 'Solv Protocol SolvBTC',
//     image: 'https://coin-images.coingecko.com/coins/images/36800/large/solvBTC.png?1719810684',
//     current_price: 87320,
//     market_cap: 1334339146,
//     market_cap_rank: 71,
//     fully_diluted_valuation: 1334335559,
//     total_volume: 1411163,
//     high_24h: 88345,
//     low_24h: 84505,
//     price_change_24h: 2754.63,
//     price_change_percentage_24h: 3.25741,
//     market_cap_change_24h: 19831712,
//     market_cap_change_percentage_24h: 1.50868,
//     circulating_supply: 15289.36208921014,
//     total_supply: 15289.32097868571,
//     max_supply: 21000000,
//     ath: 108929,
//     ath_change_percentage: -19.83726,
//     ath_date: '2025-01-20T07:17:19.296Z',
//     atl: 49058,
//     atl_change_percentage: 77.99557,
//     atl_date: '2024-08-05T06:28:45.311Z',
//     roi: null,
//     last_updated: '2025-04-21T20:00:08.689Z'
//   },
//   {
//     id: 'kucoin-shares',
//     symbol: 'kcs',
//     name: 'KuCoin',
//     image: 'https://coin-images.coingecko.com/coins/images/1047/large/sa9z79.png?1696502152',
//     current_price: 9.86,
//     market_cap: 1228861313,
//     market_cap_rank: 72,
//     fully_diluted_valuation: 1400841472,
//     total_volume: 36107,
//     high_24h: 10.06,
//     low_24h: 9.74,
//     price_change_24h: 0.090167,
//     price_change_percentage_24h: 0.92266,
//     market_cap_change_24h: 8671043,
//     market_cap_change_percentage_24h: 0.71063,
//     circulating_supply: 125043917.8513356,
//     total_supply: 142543917.8513356,
//     max_supply: null,
//     ath: 28.83,
//     ath_change_percentage: -65.93624,
//     ath_date: '2021-12-01T15:09:35.541Z',
//     atl: 0.342863,
//     atl_change_percentage: 2764.27552,
//     atl_date: '2019-02-07T00:00:00.000Z',
//     roi: null,
//     last_updated: '2025-04-21T20:00:17.932Z'
//   },
//   {
//     id: 'optimism',
//     symbol: 'op',
//     name: 'Optimism',
//     image: 'https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png?1696524385',
//     current_price: 0.709459,
//     market_cap: 1175867693,
//     market_cap_rank: 73,
//     fully_diluted_valuation: 3047643458,
//     total_volume: 102967034,
//     high_24h: 0.733265,
//     low_24h: 0.708555,
//     price_change_24h: -0.007047587029830216,
//     price_change_percentage_24h: -0.9836,
//     market_cap_change_24h: -10096698.845878124,
//     market_cap_change_percentage_24h: -0.85135,
//     circulating_supply: 1657120774,
//     total_supply: 4294967296,
//     max_supply: 4294967296,
//     ath: 4.84,
//     ath_change_percentage: -85.31878,
//     ath_date: '2024-03-06T08:35:50.817Z',
//     atl: 0.402159,
//     atl_change_percentage: 76.84637,
//     atl_date: '2022-06-18T20:54:52.178Z',
//     roi: null,
//     last_updated: '2025-04-21T20:00:13.782Z'
//   },
