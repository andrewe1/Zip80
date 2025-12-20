/**
 * ==============================================================================
 * FILE MAINTENANCE & AI PROTOCOL
 * 1. CHANGE LOG: 
 *    - [2025-12-20] - [Init] - [Created script to generate year-long dummy data]
 * 2. INSTRUCTION:
 *    - When editing this file, always update the Change Log above.
 *    - Explain the "WHY" behind complex logic in inline comments.
 * 3. PRESERVATION:
 *    - Do not remove this header block.
 * ==============================================================================
 * 
 * PURPOSE: Generate a year's worth of realistic expense tracker test data
 * across multiple account types for testing historical graphs and analytics.
 * 
 * USAGE: node generate_year_data.js > dummy_year_data.json
 */

// Helper to get random int in range
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to get random float rounded to 2 decimals
function randFloat(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Pick random item from array
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Categories with weights for realistic distribution
const expenseCategories = {
    food: ['Groceries', 'Restaurant', 'Fast Food', 'Coffee Shop', 'Food Delivery', 'Bakery', 'Pizza', 'Sushi', 'Tacos', 'Brunch'],
    utilities: ['Electric Bill', 'Water Bill', 'Gas Bill', 'Internet', 'Phone Bill', 'Trash Service'],
    transport: ['Gas Station', 'Uber', 'Lyft', 'Parking', 'Car Wash', 'Bus Pass', 'Toll Road', 'Car Maintenance', 'Tire Service'],
    housing: ['Rent', 'Home Insurance', 'HOA Fee', 'Home Repair', 'Furniture', 'Home Decor', 'Cleaning Supplies'],
    health: ['Pharmacy', 'Doctor Visit', 'Gym Membership', 'Vitamins', 'Dentist', 'Eye Doctor', 'Health Insurance'],
    fun: ['Netflix', 'Spotify', 'Movies', 'Concert', 'Video Games', 'Books', 'Streaming', 'Hobbies', 'Sports Event'],
    work: ['Office Supplies', 'Software', 'Training', 'Business Lunch', 'Coworking Space', 'Professional Tools'],
    general: ['Amazon', 'Target', 'Walmart', 'Costco', 'Gift', 'Clothing', 'Electronics', 'Subscription']
};

// Income sources
const incomeSources = ['Salary', 'Freelance Payment', 'Bonus', 'Tax Refund', 'Dividend', 'Side Project', 'Consulting'];

// Crypto transaction descriptions
const cryptoDescs = {
    buy: ['Buy BTC', 'Purchase Bitcoin', 'DCA BTC', 'Market Buy', 'Limit Order Fill'],
    sell: ['Sell BTC', 'Take Profit', 'Cash Out', 'Convert to USD'],
    transfer: ['Transfer to Ledger', 'Move to Cold Storage', 'Send to Exchange', 'Staking Reward', 'Mining Reward', 'Airdrop']
};

const cryptoDescsETH = {
    buy: ['Buy ETH', 'Purchase Ethereum', 'DCA ETH', 'Swap for ETH'],
    sell: ['Sell ETH', 'Take Profit ETH', 'Convert ETH'],
    transfer: ['Gas Fee', 'NFT Mint', 'DeFi Deposit', 'Staking Reward ETH', 'Swap Fee']
};

// Generate date string
function dateStr(year, month, day, hour = 12, minute = 0) {
    const d = new Date(year, month - 1, day, hour, minute);
    return d.toISOString();
}

// Account definitions
const accounts = [
    {
        id: 'acc_checking_main',
        type: 'checking',
        name: 'Main Checking',
        currency: 'USD',
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_savings_1',
        type: 'checking',
        name: 'Emergency Fund',
        currency: 'USD',
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_cash_wallet',
        type: 'cash',
        name: 'Cash Wallet',
        currency: 'USD',
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_credit_visa',
        type: 'credit',
        name: 'Visa Platinum',
        currency: 'USD',
        creditLimit: 10000,
        paymentDueDay: 20,
        statementCloseDay: 5,
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_credit_amex',
        type: 'credit',
        name: 'Amex Gold',
        currency: 'USD',
        creditLimit: 15000,
        paymentDueDay: 25,
        statementCloseDay: 10,
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_credit_mxn',
        type: 'credit',
        name: 'Banamex Oro',
        currency: 'MXN',
        creditLimit: 50000,
        paymentDueDay: 15,
        statementCloseDay: 28,
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_crypto_btc',
        type: 'crypto',
        name: 'Bitcoin Wallet',
        currency: 'BTC',
        createdAt: '2024-12-01T10:00:00.000Z'
    },
    {
        id: 'acc_crypto_eth',
        type: 'crypto',
        name: 'Ethereum Wallet',
        currency: 'ETH',
        createdAt: '2024-12-01T10:00:00.000Z'
    }
];

// Store all transactions
let transactions = [];
let txId = 1704067200000; // Start from Jan 1, 2024

function addTx(accountId, desc, amt, date, category = null) {
    const tx = {
        id: txId++,
        accountId,
        desc,
        amt,
        date,
        createdBy: null
    };
    if (category) tx.category = category;
    transactions.push(tx);
}

// Generate transactions for the year 2024 (Dec 1, 2023 to Dec 20, 2024)
const startYear = 2024;

// --- MAIN CHECKING ACCOUNT ---
// Monthly salary on 1st and 15th
for (let month = 1; month <= 12; month++) {
    // Salary deposits
    addTx('acc_checking_main', 'Salary Deposit', 4500, dateStr(startYear, month, 1, 9, 0));
    addTx('acc_checking_main', 'Salary Deposit', 4500, dateStr(startYear, month, 15, 9, 0));

    // Monthly rent on the 1st
    addTx('acc_checking_main', 'Rent Payment', -1800, dateStr(startYear, month, 1, 10, 0), 'housing');

    // Utilities mid-month
    addTx('acc_checking_main', 'Electric Bill', -randFloat(80, 180), dateStr(startYear, month, randInt(10, 15), 10, 0), 'utilities');
    addTx('acc_checking_main', 'Internet Bill', -89.99, dateStr(startYear, month, randInt(5, 10), 9, 0), 'utilities');
    addTx('acc_checking_main', 'Water Bill', -randFloat(35, 65), dateStr(startYear, month, randInt(15, 20), 10, 0), 'utilities');
    addTx('acc_checking_main', 'Phone Bill', -75.00, dateStr(startYear, month, randInt(10, 15), 11, 0), 'utilities');

    // Car insurance quarterly
    if (month % 3 === 1) {
        addTx('acc_checking_main', 'Car Insurance', -350, dateStr(startYear, month, 5, 10, 0), 'transport');
    }

    // Gas 2-3 times per month
    for (let i = 0; i < randInt(2, 4); i++) {
        addTx('acc_checking_main', 'Gas Station', -randFloat(35, 65), dateStr(startYear, month, randInt(1, 28), randInt(8, 20), randInt(0, 59)), 'transport');
    }

    // Grocery shopping 3-4 times per month
    const groceryStores = ['Whole Foods', 'Trader Joe\'s', 'Costco', 'Kroger', 'Safeway'];
    for (let i = 0; i < randInt(3, 5); i++) {
        addTx('acc_checking_main', `Groceries - ${pick(groceryStores)}`, -randFloat(60, 180), dateStr(startYear, month, randInt(1, 28), randInt(10, 19), randInt(0, 59)), 'food');
    }

    // Random daily expenses 5-10 per month
    for (let i = 0; i < randInt(5, 10); i++) {
        const cat = pick(['food', 'transport', 'health', 'general']);
        const desc = pick(expenseCategories[cat]);
        addTx('acc_checking_main', desc, -randFloat(10, 80), dateStr(startYear, month, randInt(1, 28), randInt(8, 21), randInt(0, 59)), cat);
    }

    // Gym membership
    addTx('acc_checking_main', 'Gym Membership', -50, dateStr(startYear, month, 1, 8, 0), 'health');

    // Credit card payments
    addTx('acc_checking_main', 'Visa Payment', -randFloat(500, 1500), dateStr(startYear, month, 18, 10, 0), 'general');
    addTx('acc_checking_main', 'Amex Payment', -randFloat(300, 1000), dateStr(startYear, month, 23, 10, 0), 'general');

    // Transfer to savings
    if (month % 2 === 0) {
        addTx('acc_checking_main', 'Transfer to Savings', -500, dateStr(startYear, month, 16, 9, 0), 'general');
    }

    // Occasional bonus or extra income
    if (month === 3 || month === 6 || month === 9 || month === 12) {
        addTx('acc_checking_main', 'Quarterly Bonus', randFloat(1000, 2500), dateStr(startYear, month, randInt(20, 28), 14, 0));
    }
}

// --- SAVINGS ACCOUNT ---
for (let month = 1; month <= 12; month++) {
    // Interest
    addTx('acc_savings_1', 'Interest Payment', randFloat(15, 45), dateStr(startYear, month, 28, 8, 0));

    // Bi-monthly deposits from checking
    if (month % 2 === 0) {
        addTx('acc_savings_1', 'Transfer from Checking', 500, dateStr(startYear, month, 16, 9, 30));
    }

    // Occasional emergency withdrawal
    if (month === 4 || month === 8) {
        addTx('acc_savings_1', 'Emergency Withdrawal', -randFloat(200, 500), dateStr(startYear, month, randInt(10, 20), 14, 0));
    }
}

// --- CASH WALLET ---
for (let month = 1; month <= 12; month++) {
    // ATM withdrawals
    addTx('acc_cash_wallet', 'ATM Withdrawal', 200, dateStr(startYear, month, randInt(1, 5), 12, 0));
    addTx('acc_cash_wallet', 'ATM Withdrawal', 100, dateStr(startYear, month, randInt(15, 20), 14, 0));

    // Small cash expenses
    const cashExpenses = ['Street Food', 'Tips', 'Parking Meter', 'Vending Machine', 'Flea Market', 'Street Vendor', 'Cash for Friend', 'Farmers Market'];
    for (let i = 0; i < randInt(8, 15); i++) {
        const desc = pick(cashExpenses);
        const cat = desc.includes('Food') || desc.includes('Market') || desc.includes('Vendor') ? 'food' : 'general';
        addTx('acc_cash_wallet', desc, -randFloat(5, 35), dateStr(startYear, month, randInt(1, 28), randInt(10, 21), randInt(0, 59)), cat);
    }
}

// --- VISA CREDIT CARD ---
for (let month = 1; month <= 12; month++) {
    // Online shopping
    for (let i = 0; i < randInt(3, 6); i++) {
        const stores = ['Amazon', 'Best Buy', 'Target Online', 'Walmart.com', 'eBay', 'Etsy'];
        addTx('acc_credit_visa', pick(stores), -randFloat(20, 250), dateStr(startYear, month, randInt(1, 28), randInt(9, 22), randInt(0, 59)), 'general');
    }

    // Subscriptions
    addTx('acc_credit_visa', 'Netflix', -15.99, dateStr(startYear, month, 5, 3, 0), 'fun');
    addTx('acc_credit_visa', 'Spotify Premium', -10.99, dateStr(startYear, month, 8, 3, 0), 'fun');
    addTx('acc_credit_visa', 'Disney+', -13.99, dateStr(startYear, month, 12, 3, 0), 'fun');
    addTx('acc_credit_visa', 'iCloud Storage', -2.99, dateStr(startYear, month, 15, 3, 0), 'general');

    // Dining out
    for (let i = 0; i < randInt(4, 8); i++) {
        const restaurants = ['Chipotle', 'Olive Garden', 'The Cheesecake Factory', 'P.F. Chang\'s', 'Outback', 'Red Lobster', 'Applebee\'s', 'Texas Roadhouse'];
        addTx('acc_credit_visa', pick(restaurants), -randFloat(25, 120), dateStr(startYear, month, randInt(1, 28), randInt(18, 21), randInt(0, 59)), 'food');
    }

    // Travel expenses (bigger in summer months)
    if (month >= 6 && month <= 8) {
        addTx('acc_credit_visa', 'Hotel Booking', -randFloat(150, 400), dateStr(startYear, month, randInt(10, 20), 14, 0), 'housing');
        addTx('acc_credit_visa', 'Flight Tickets', -randFloat(200, 600), dateStr(startYear, month, randInt(1, 10), 11, 0), 'transport');
    }

    // Holiday shopping in Nov/Dec
    if (month === 11 || month === 12) {
        for (let i = 0; i < randInt(5, 10); i++) {
            addTx('acc_credit_visa', 'Holiday Gift', -randFloat(30, 200), dateStr(startYear, month, randInt(1, 28), randInt(10, 20), randInt(0, 59)), 'general');
        }
    }
}

// --- AMEX CREDIT CARD ---
for (let month = 1; month <= 12; month++) {
    // Higher-end dining
    for (let i = 0; i < randInt(2, 4); i++) {
        const fineRestaurants = ['Ruth\'s Chris', 'Morton\'s', 'Capital Grille', 'The Palm', 'Nobu', 'STK', 'Fleming\'s'];
        addTx('acc_credit_amex', pick(fineRestaurants), -randFloat(100, 350), dateStr(startYear, month, randInt(1, 28), randInt(19, 22), randInt(0, 59)), 'food');
    }

    // Business expenses
    for (let i = 0; i < randInt(2, 5); i++) {
        const bizExpenses = ['Software License', 'Business Lunch', 'Conference Fee', 'Professional Books', 'Hardware', 'Domain Renewal', 'Cloud Services'];
        addTx('acc_credit_amex', pick(bizExpenses), -randFloat(50, 300), dateStr(startYear, month, randInt(1, 28), randInt(10, 17), randInt(0, 59)), 'work');
    }

    // Premium subscriptions
    addTx('acc_credit_amex', 'Adobe Creative Cloud', -54.99, dateStr(startYear, month, 10, 3, 0), 'work');
    addTx('acc_credit_amex', 'LinkedIn Premium', -29.99, dateStr(startYear, month, 15, 3, 0), 'work');

    // Occasional big purchase
    if (month === 3 || month === 7 || month === 11) {
        const bigItems = ['New Laptop', 'Camera Gear', 'Smart Watch', 'Furniture Set', 'Home Theater', 'Kitchen Appliance'];
        addTx('acc_credit_amex', pick(bigItems), -randFloat(500, 2000), dateStr(startYear, month, randInt(10, 20), 15, 0), 'general');
    }
}

// --- MEXICAN CREDIT CARD (MXN) ---
for (let month = 1; month <= 12; month++) {
    // Local shopping in MXN
    const mxnStores = ['Liverpool', 'Palacio de Hierro', 'Coppel', 'Soriana', 'Oxxo', 'Chedraui', 'La Comer'];
    for (let i = 0; i < randInt(3, 6); i++) {
        addTx('acc_credit_mxn', pick(mxnStores), -randFloat(200, 3000), dateStr(startYear, month, randInt(1, 28), randInt(10, 20), randInt(0, 59)), 'general');
    }

    // Mexican restaurants
    for (let i = 0; i < randInt(2, 4); i++) {
        const mxnRestaurants = ['Tacos El Paisa', 'La Casa de Toño', 'El Fogoncito', 'Sanborns', 'Vips', 'Los Bisquets'];
        addTx('acc_credit_mxn', pick(mxnRestaurants), -randFloat(150, 800), dateStr(startYear, month, randInt(1, 28), randInt(12, 21), randInt(0, 59)), 'food');
    }

    // Services in MXN
    addTx('acc_credit_mxn', 'Telmex Internet', -899, dateStr(startYear, month, randInt(5, 10), 10, 0), 'utilities');
    addTx('acc_credit_mxn', 'CFE Electric', -randFloat(400, 1200), dateStr(startYear, month, randInt(15, 20), 10, 0), 'utilities');
}

// --- BITCOIN WALLET ---
// Generate realistic crypto activity with DCA strategy
for (let month = 1; month <= 12; month++) {
    // DCA buys every week (approximately)
    for (let week = 0; week < 4; week++) {
        const day = Math.min(28, 1 + week * 7 + randInt(0, 2));
        addTx('acc_crypto_btc', pick(cryptoDescs.buy), randFloat(0.002, 0.008), dateStr(startYear, month, day, randInt(8, 20), randInt(0, 59)));
    }

    // Occasional staking/mining rewards
    if (randInt(1, 3) === 1) {
        addTx('acc_crypto_btc', pick(cryptoDescs.transfer), randFloat(0.0001, 0.0005), dateStr(startYear, month, randInt(1, 28), randInt(8, 20), randInt(0, 59)));
    }

    // Take some profits in good months
    if (month === 3 || month === 7 || month === 11) {
        addTx('acc_crypto_btc', pick(cryptoDescs.sell), -randFloat(0.005, 0.015), dateStr(startYear, month, randInt(15, 25), 14, 0));
    }

    // Transfers to cold storage quarterly
    if (month % 3 === 0) {
        addTx('acc_crypto_btc', 'Transfer to Ledger', -randFloat(0.01, 0.03), dateStr(startYear, month, 25, 10, 0));
    }
}

// --- ETHEREUM WALLET ---
for (let month = 1; month <= 12; month++) {
    // ETH accumulation
    for (let week = 0; week < 2; week++) {
        const day = Math.min(28, 1 + week * 14 + randInt(0, 5));
        addTx('acc_crypto_eth', pick(cryptoDescsETH.buy), randFloat(0.05, 0.3), dateStr(startYear, month, day, randInt(8, 20), randInt(0, 59)));
    }

    // Gas fees for DeFi/NFT activity
    for (let i = 0; i < randInt(2, 6); i++) {
        addTx('acc_crypto_eth', 'Gas Fee', -randFloat(0.001, 0.02), dateStr(startYear, month, randInt(1, 28), randInt(8, 22), randInt(0, 59)));
    }

    // Staking rewards
    addTx('acc_crypto_eth', 'Staking Reward ETH', randFloat(0.01, 0.05), dateStr(startYear, month, 28, 3, 0));

    // Occasional NFT or DeFi activity
    if (randInt(1, 3) === 1) {
        addTx('acc_crypto_eth', 'NFT Mint', -randFloat(0.05, 0.2), dateStr(startYear, month, randInt(5, 25), randInt(12, 20), 0));
    }
}

// Sort transactions by date
transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

// Build final JSON structure
const output = {
    version: 2,
    accounts,
    transactions
};

// Output to console
console.log(JSON.stringify(output, null, 2));
