const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const fs = require('fs');

const constants = require('./constants.js');

// This port will be used by Lighthouse later. The specific port is arbitrary.
const PORT = 8041;

async function login(browser, origin) {
    const page = await browser.newPage();
    await page.goto(origin);
    await page.waitForSelector('input[type="email"]', {
        visible: true
    });

    const emailInput = await page.$('input[type="email"]');
    // Enter your Email Id
    await emailInput.type('');
    const passwordInput = await page.$('input[type="password"]');
    //Enter your password
    await passwordInput.type('');

    await Promise.all([
        page.$eval('#next', login => login.click()),
        // Optional: Default timeout(30000)
        page.setDefaultNavigationTimeout(600000),
        page.waitForNavigation(),
    ]);

    const authToken = await page.evaluate(() => document.getElementById('SessionID').value);
    console.log(authToken);
    const userId = await page.evaluate(() => document.getElementById('UserID').value);
    console.log(userId);


    const url = `https://dev-decumulation.feanalytics.com/?AuthToken=${authToken}&UserId=${userId}#/landing`;

    return url;
}

async function logout(browser, origin) {
    const page = await browser.newPage();
    await page.goto(`${origin}/logout`);
    await page.close();
}

async function main() {

    const browser = await puppeteer.launch({
        args: [`--remote-debugging-port=${PORT}`],
        headless: false,
        slowMo: 10,
    });

    const url = await login(browser, 'https://dev.feanalytics.com');

    /** @type {LH.Config.Json} */
    const options = {
        port: PORT,
        output: 'html',
    };
    const config = {
        extends: 'lighthouse:default',
        settings: {
            formFactor: 'desktop',
            throttling: constants.throttling.desktopDense4G,
            screenEmulation: constants.screenEmulationMetrics.desktop,
            emulatedUserAgent: constants.userAgents.desktop,
        },
    };
    console.log("config - ", config);

    // Run Lighthouse.
    const result = await lighthouse(url, options, config);

    console.log(`Lighthouse scores: ${Object.values(result.lhr.categories).map(c => c.score).join(', ')}`);

    fs.writeFileSync("report.html", result.report, "utf-8");

    await browser.close();
}

if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.log(e);
    }
} else {
    module.exports = {
        login,
        logout,
    };
}