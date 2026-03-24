// ==========================================
// 1. SUPABASE SETUP
// ==========================================
const supabaseUrl = 'https://iupvcjquihkxtklderft.supabase.co'; 
const supabaseKey = 'sb_publishable_kQchxWexBx8bQyPEqgD-Qg_TqfPBOXR';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let liveRates = { USD: 0, EUR: 0, GOLD_24: 0, GOLD_21: 0, GOLD_18: 0, BTC: 0, ETH: 0 };
let selectedPlanPriceUSD = 0;
let goldHistoryChartData = []; 
let chartLabels = [];
let btcTargetAlert = null;

// ==========================================
// 2. AUTHENTICATION
// ==========================================
async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert("Please enter email and password.");
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert("Sign Up Error: " + error.message); else showDashboard();
}

async function simulateLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert("Please enter email and password.");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Login Error: " + error.message); else showDashboard();
}

async function logout() {
    await supabaseClient.auth.signOut();
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
}

// ==========================================
// 3. DASHBOARD & LIVE DATA PIPELINE
// ==========================================
function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    
    fetchAllData(); 
    checkProStatus(); 
    setInterval(() => { fetchAllData(); }, 60000); 
}

function fetchAllData() {
    fetchCurrencyAndGold();
    fetchCrypto();
    fetchStocks();
}

function flashElement(id) {
    const el = document.getElementById(id);
    if(el) {
        el.classList.remove('updated-data');
        void el.offsetWidth; 
        el.classList.add('updated-data');
    }
}

// SAFE Element Updater (Prevents Crashes)
function updateEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function getSparkline(isPositive) {
    const color = isPositive ? '#34c759' : '#ff453a';
    const points = isPositive ? "0,12 10,8 20,10 30,5 40,2" : "0,2 10,5 20,4 30,10 40,12";
    return `<svg width="40" height="15" viewBox="0 0 40 15" style="margin-right: 10px;"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}

function updateBadge(id, percentChange) {
    const el = document.getElementById(id);
    if(el) {
        const isPositive = percentChange >= 0;
        el.innerText = `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`;
        el.className = `change-badge ${isPositive ? 'positive' : 'negative'}`;
        
        const sparkEl = document.getElementById(id.replace('-change', '-spark'));
        if(sparkEl) sparkEl.innerHTML = getSparkline(isPositive);
    }
    return percentChange;
}

function generateInsights(btcChange, aaplChange) {
    const el = document.getElementById('ai-insight');
    if(!el) return;
    
    let text = "Market is stable. ";
    if (btcChange > 2) text = `🚀 Bitcoin is surging today (Up ${btcChange.toFixed(1)}%). `;
    else if (btcChange < -2) text = `⚠️ Bitcoin is facing heavy sell pressure (Down ${btcChange.toFixed(1)}%). `;
    
    if (aaplChange > 0) text += "Tech stocks are looking positive. ";
    else text += "Tech sector is cooling off. ";
    
    text += "Local Gold remains a strong hedge against EGP fluctuations.";
    el.innerText = text;
}

// --- FETCH 1: CURRENCY AND GOLD ---
async function fetchCurrencyAndGold() {
    try {
        const currencyResponse = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
        const currencyData = await currencyResponse.json();
        liveRates.USD = currencyData.rates['EGP'];
        liveRates.EUR = (currencyData.rates['EGP'] / currencyData.rates['EUR']);
        
        const goldKey = 'goldapi-39slssmn3hv3d0-io'; 
        const goldHeaders = new Headers();
        goldHeaders.append("x-access-token", goldKey);
        const goldResponse = await fetch("https://www.goldapi.io/api/XAU/USD", { method: 'GET', headers: goldHeaders });
        const goldData = await goldResponse.json();

        const saghaDollar = liveRates.USD * 1.015; 
        const pricePerGramUSD_24 = goldData.price / 31.1035;
        liveRates.GOLD_24 = pricePerGramUSD_24 * saghaDollar;
        liveRates.GOLD_21 = liveRates.GOLD_24 * (21 / 24);
        liveRates.GOLD_18 = liveRates.GOLD_24 * (18 / 24);

        updateEl('usd-price', liveRates.USD.toFixed(2));
        updateEl('eur-price', liveRates.EUR.toFixed(2));
        updateEl('gold-24-price', Math.round(liveRates.GOLD_24).toLocaleString());
        updateEl('gold-21-price', Math.round(liveRates.GOLD_21).toLocaleString());
        updateEl('gold-18-price', Math.round(liveRates.GOLD_18).toLocaleString());

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if(goldHistoryChartData.length === 0) {
            goldHistoryChartData = [liveRates.GOLD_24 - 40, liveRates.GOLD_24 - 15, liveRates.GOLD_24 + 20, liveRates.GOLD_24 - 5, liveRates.GOLD_24];
            chartLabels = ['-4m', '-3m', '-2m', '-1m', timeString];
        } else {
            goldHistoryChartData.push(liveRates.GOLD_24);
            chartLabels.push(timeString);
            if (goldHistoryChartData.length > 8) { goldHistoryChartData.shift(); chartLabels.shift(); }
        }
        drawChart();

        const masna3eyaIngot = 62; 
        const masna3eyaPound = 48.5;

        const goldPound = (liveRates.GOLD_21 + masna3eyaPound) * 8; 
        
        // SAFELY Update all gold assets
        updateEl('gold-pound', `${Math.round(goldPound).toLocaleString()} EGP`);
        updateEl('gold-2.5', `${Math.round((liveRates.GOLD_24 + masna3eyaIngot) * 2.5).toLocaleString()} EGP`);
        updateEl('gold-5', `${Math.round((liveRates.GOLD_24 + masna3eyaIngot) * 5).toLocaleString()} EGP`);
        updateEl('gold-10', `${Math.round((liveRates.GOLD_24 + masna3eyaIngot) * 10).toLocaleString()} EGP`);
        updateEl('gold-50', `${Math.round((liveRates.GOLD_24 + masna3eyaIngot) * 50).toLocaleString()} EGP`);
        
        // Update all badges safely
        updateBadge('gold-pound-change', 0.8);
        updateBadge('gold-2.5-change', 1.0);
        updateBadge('gold-5-change', 1.1);
        updateBadge('gold-10-change', 1.2);
        updateBadge('gold-50-change', 1.2);

        updateEl('last-updated', "Updated: " + timeString);
        calculateExchange();
        calculateNetWorth();
    } catch (error) { console.error("Error fetching Gold:", error); }
}

// --- FETCH 2: LIVE CRYPTO ---
async function fetchCrypto() {
    try {
        const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
        const ethRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT');
        const btcData = await btcRes.json();
        const ethData = await ethRes.json();
        
        liveRates.BTC = parseFloat(btcData.lastPrice);
        liveRates.ETH = parseFloat(ethData.lastPrice);

        const btcChange = parseFloat(btcData.priceChangePercent);
        const ethChange = parseFloat(ethData.priceChangePercent);

        updateEl('btc-price', `$${liveRates.BTC.toLocaleString('en-US', {maximumFractionDigits: 0})}`);
        updateEl('eth-price', `$${liveRates.ETH.toLocaleString('en-US', {maximumFractionDigits: 0})}`);
        
        updateBadge('btc-change', btcChange);
        updateBadge('eth-change', ethChange);
        
        if (btcTargetAlert && liveRates.BTC >= btcTargetAlert) {
            alert(`🎯 ALERT TRIGERRED: Bitcoin has crossed your target of $${btcTargetAlert}!`);
            btcTargetAlert = null; 
        }

        flashElement('btc-price'); flashElement('eth-price');
        generateInsights(btcChange, 1.5); 
    } catch (error) { console.error("Error fetching Crypto:", error); }
}

// --- FETCH 3: REAL GLOBAL STOCKS ---
async function fetchStocks() {
    try {
        const finnhubKey = 'd70t1b1r01ql6rg0ijn0d70t1b1r01ql6rg0ijng'; 
        const symbols = ['AAPL', 'TSLA', 'MSFT'];
        
        for (let symbol of symbols) {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`);
            const data = await response.json();
            
            if (data && data.c) { 
                updateEl(`${symbol.toLowerCase()}-price`, `$${data.c.toFixed(2)}`);
                updateBadge(`${symbol.toLowerCase()}-change`, data.dp || 0); 
                flashElement(`${symbol.toLowerCase()}-price`);
            }
        }
    } catch (error) { console.error("Error fetching Stocks:", error); }
}

// ==========================================
// 4. ALERTS & TRACKING
// ==========================================
function setAlert(asset) {
    const target = prompt(`Set target price for ${asset} (USD):`);
    if (target && !isNaN(target)) {
        btcTargetAlert = parseFloat(target);
        alert(`${asset} Alert set for $${btcTargetAlert}. Ensure dashboard stays open.`);
    }
}

function trackAsset(asset) {
    alert(`${asset} added to your active watchlist! Detailed analytics opening...`);
}

// ==========================================
// 5. CHECKOUT UI & USERNAME
// ==========================================
function openSubscriptionModal() { document.getElementById('sub-modal').style.display = 'flex'; document.getElementById('plan-selection').style.display = 'block'; document.getElementById('checkout-section').style.display = 'none'; document.getElementById('student-section').style.display = 'none'; }
function closeSubscriptionModal() { document.getElementById('sub-modal').style.display = 'none'; }

function showCheckout(planName, priceUSD) {
    selectedPlanPriceUSD = priceUSD;
    document.getElementById('plan-selection').style.display = 'none';
    if (planName === 'Student') {
        document.getElementById('student-section').style.display = 'block';
    } else {
        document.getElementById('checkout-section').style.display = 'block';
        document.getElementById('checkout-summary').innerText = `You selected: Pro ${planName} ($${priceUSD}.00).`;
        const liveEGP = (priceUSD * liveRates.USD).toFixed(2);
        updateEl('instapay-egp-price', `${liveEGP} EGP`);
    }
}

function backToPlans() { document.getElementById('checkout-section').style.display = 'none'; document.getElementById('student-section').style.display = 'none'; document.getElementById('plan-selection').style.display = 'block'; }

function saveUsername(inputId) {
    let name = document.getElementById(inputId).value.trim();
    if (!name) name = "Pro Trader"; 
    localStorage.setItem('traderUsername', name);
}

function verifyStudent() {
    const emailInput = document.getElementById('student-email-input').value.toLowerCase();
    if (emailInput.endsWith('.edu.eg')) {
        saveUsername('student-username');
        localStorage.setItem('isProUser', 'true');
        checkProStatus();
        closeSubscriptionModal();
    } else alert("Must use .edu.eg email");
}

function processPayment() { saveUsername('checkout-username'); localStorage.setItem('isProUser', 'true'); checkProStatus(); closeSubscriptionModal(); }

function checkProStatus() {
    const isPro = localStorage.getItem('isProUser') === 'true';
    if (isPro) {
        document.getElementById('portfolio-section').classList.remove('locked');
        document.getElementById('lock-overlay').style.display = 'none';
        document.getElementById('premium-markets-section').classList.remove('locked');
        document.getElementById('lock-overlay-2').style.display = 'none';
        
        const traderName = localStorage.getItem('traderUsername') || 'Pro Trader';
        updateEl('header-title', traderName);
        document.getElementById('ig-verified-badge').style.display = 'inline-flex';
    }
}

function formatDate() {
    let dateInput = document.getElementById('cc-date');
    if (!dateInput) return;
    let cleaned = dateInput.value.replace(/[^0-9]/g, ''); 
    if (cleaned.length >= 2) cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    dateInput.value = cleaned;
}

// ==========================================
// 6. CALCULATORS & GRAPH
// ==========================================
function calculateExchange() {
    const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
    const currency = document.getElementById('calc-currency').value;
    let result = currency === 'USD' ? amount * liveRates.USD : amount * liveRates.EUR;
    updateEl('calc-result', result.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " EGP");
}

function calculateNetWorth() {
    const goldGrams = parseFloat(document.getElementById('owned-gold').value) || 0;
    const selectedKarat = document.getElementById('gold-karat').value;
    const usdCash = parseFloat(document.getElementById('owned-usd').value) || 0;
    
    let activeGoldPrice = liveRates.GOLD_24;
    if (selectedKarat === "21") activeGoldPrice = liveRates.GOLD_21;
    if (selectedKarat === "18") activeGoldPrice = liveRates.GOLD_18;
    if (selectedKarat === "24") activeGoldPrice += 62;

    const totalNetWorth = (goldGrams * activeGoldPrice) + (usdCash * liveRates.USD);
    updateEl('net-worth', totalNetWorth.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
}

let myChart = null;
function drawChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    if (myChart != null) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels, 
            datasets: [{ 
                label: '24k Gold (EGP)', 
                data: goldHistoryChartData, 
                borderColor: '#FFD700', 
                backgroundColor: 'rgba(255, 215, 0, 0.1)', 
                borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#ffffff', pointRadius: 4 
            }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'white' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'white' } } } }
    });
}