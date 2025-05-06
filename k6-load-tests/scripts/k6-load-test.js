import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Custom metrics
const loginFailures = new Rate('login_failures');
const apiResponseTime = new Trend('api_response_time');

// Load test configuration
export const options = {
    stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '2m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<3000'],     // 95% requests below 3s
        http_req_failed: ['rate<0.05'],        // Error rate lower than 5%
        login_failures: ['rate<0.1'],          // failures below 10%
        api_response_time: ['p(90)<2000'],     // 90% API calls below 2s
    },
};

// Test users 
const TEST_USERS = [
    { email: 'john@example.com', password: 'password123', name: 'John Doe' },
    { email: 'jane@example.com', password: 'password123', name: 'Jane Smith' },
    { email: 'bob@example.com', password: 'password123', name: 'Bob Wilson' },
    { email: 'alice@example.com', password: 'password123', name: 'Alice Cooper' },
    { email: 'mike@example.com', password: 'password123', name: 'Mike Johnson' },
    { email: 'sarah@example.com', password: 'password123', name: 'Sarah Lee' },
    { email: 'tom@example.com', password: 'password123', name: 'Tom Harris' },
    { email: 'emma@example.com', password: 'password123', name: 'Emma Davis' },
];

const BASE_URL = __ENV.BASE_URL || 'https://www.warriortournaments.ie';

// Generate realistic user agent strings
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Main test scenario
export default function () {
    const userIndex = __VU % TEST_USERS.length;
    const user = TEST_USERS[userIndex];

    const headers = {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };

    console.log(`VU ${__VU} using account: ${user.email}`);

    // Login flow using NextAuth credentials provider
    const token = loginWithNextAuth(user, headers);

    if (token) {
        // Authenticated user flow
        authenticatedUserFlow(token, headers);
    }

    // Random think time between requests
    sleep(Math.random() * 3 + 1);
}

function loginWithNextAuth(user, headers) {
    const loginStart = new Date();

    try {
        // Get the login page to obtain any necessary cookies/CSRF tokens
        const loginPageRes = http.get(`${BASE_URL}/login`, { headers, redirects: 0 });

        const cookies = loginPageRes.cookies;
        const cookieHeader = Object.keys(cookies)
            .map(key => `${key}=${cookies[key][0].value}`)
            .join('; ');

        // Prepare login payload
        const loginPayload = [
            `email=${encodeURIComponent(user.email)}`,
            `password=${encodeURIComponent(user.password)}`,
            `remember=true`,
            `redirect=false`,
            `callbackUrl=${encodeURIComponent('/')}`,
            `json=true`
        ].join('&');

        // Login using endpoint
        const loginRes = http.post(`${BASE_URL}/api/auth/callback/credentials`, loginPayload, {
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieHeader,
                'Referer': `${BASE_URL}/login`,
            },
            redirects: 0,
        });

        const loginSuccess = check(loginRes, {
            'login status is 200': (r) => r.status === 200,
            'login returns JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
            'no error in response': (r) => r.body && !JSON.parse(r.body).error,
        });

        loginFailures.add(!loginSuccess);
        apiResponseTime.add(new Date() - loginStart);

        if (loginSuccess) {
            // Extract session cookies
            const sessionCookies = loginRes.cookies;
            const sessionToken = sessionCookies['next-auth.session-token'] ||
                sessionCookies['__Secure-next-auth.session-token'];

            if (sessionToken) {
                return sessionToken[0].value;
            }
        }

        return null;
    } catch (error) {
        console.error(`Login error for ${user.email}:`, error);
        loginFailures.add(1);
        return null;
    }
}

function authenticatedUserFlow(sessionToken, headers) {
    const authHeaders = {
        ...headers,
        'Cookie': `next-auth.session-token=${sessionToken}; __Secure-next-auth.session-token=${sessionToken}`,
    };

    try {
        // homepage access
        const dashboardRes = http.get(`${BASE_URL}`, { headers: authHeaders });
        check(dashboardRes, {
            'dashboard loads successfully': (r) => r.status === 200,
            'dashboard contains user data': (r) => r.body && r.body.includes('profile-menu-container'),
        });

        sleep(Math.random() * 3 + 1);

        // Leaderboard check
        const leaderboardRes = http.get(`${BASE_URL}/leaderBoard`, { headers: authHeaders });
        check(leaderboardRes, {
            'leaderboard loads': (r) => r.status === 200,
            'shows leaderboard data': (r) => r.body && r.body.includes('Tournaments'),
        });

        sleep(Math.random() * 2 + 1);

        // Profile view
        const profileRes = http.get(`${BASE_URL}/profile`, { headers: authHeaders });
        check(profileRes, {
            'profile loads': (r) => r.status === 200,
            'shows user rank': (r) => r.body && r.body.match(/Bronze|Silver|Gold|Platinum|Diamond|Master|Grandmaster/),
        });

        sleep(Math.random() * 2 + 1);

        const tournamentsRes = http.get(`${BASE_URL}/tournament`, { headers: authHeaders });
        check(tournamentsRes, {
            'tournaments load': (r) => r.status === 200,
            'shows tournament data': (r) => r.body && (r.body.includes('Summer Championship') || r.body.includes('Winter Classic')),
        });

        // sometimes update privacy settings 
        if (Math.random() < 0.2) {
            updatePrivacySettings(authHeaders);
        }
    } catch (error) {
        console.error('Error in authenticated flow:', error);
    }
}

function updatePrivacySettings(headers) {
    const settingsStart = new Date();

    const privacyPayload = {
        isProfilePrivate: Math.random() < 0.5,
    };

    try {
        const settingsRes = http.post(`${BASE_URL}/api/settings/privacy`, JSON.stringify(privacyPayload), {
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
        });

        check(settingsRes, {
            'settings update successful': (r) => r.status === 200,
            'success message shown': (r) => r.body && r.body.includes('Privacy settings updated'),
        });

        apiResponseTime.add(new Date() - settingsStart);
    } catch (error) {
        console.error('Error updating privacy settings:', error);
    }
}

// Run setup before the test
export function setup() {
    console.log(`\n=== Load Test Configuration ===`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Test users: ${TEST_USERS.length}`);
    console.log(`Max concurrent users: 100`);
    console.log(`Total virtual users: ${TEST_USERS.length} users x ~12.5 concurrent sessions each`);
    console.log('================================\n');

    // connectivity check
    try {
        const res = http.get(BASE_URL);
        if (res.status !== 200) {
            console.error(`Warning: Application returned status ${res.status}`);
        }
    } catch (error) {
        console.error('Warning: Could not verify application is running');
    }
    return {};
}

// Teardown after test completion
export function teardown(data) {
    console.log(`\n=== Load Test Completed ===`);
    console.log('Check the HTML report for detailed results');
    console.log('==========================\n');
}

// Generate HTML report
export function handleSummary(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `k6-load-tests/reports/production-${timestamp}`;

    return {
        [`${reportPath}-summary.html`]: htmlReport(data),
        [`${reportPath}-summary.json`]: JSON.stringify(data, null, 2),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
}