import fetch from 'node-fetch';
import pkg from '@atproto/api';
const { BskyAgent } = pkg;

// Loading environment variables
const MTA_FEED_URL = process.env.MTA_FEED_URL;
const MTA_API_KEY = process.env.MTA_API_KEY;
const BSKY_USERNAME = process.env.BSKY_USERNAME;
const BSKY_PASSWORD = process.env.BSKY_PASSWORD;

const agent = new BskyAgent({ service: 'https://bsky.social' });

let seenSkeet = [];
let newSkeetFound = false;

// Post a new alert to Bluesky with the emoji prefix
async function postSkeetToBsky(skeet) {
    const alertMessage = `🚇 ${skeet}`;
    try {
        await agent.post({
            $type: 'app.bsky.feed.post',
            text: alertMessage,
            createdAt: new Date().toISOString()
        });
        console.log('Skeet posted to Bluesky:', alertMessage);
    } catch (error) {
        console.error('Error posting to Bluesky:', error.message);
    }
}

// Fetch the latest MTA alerts
async function fetchMTAAlerts() {
    console.log('Fetching MTA alerts...');
    newSkeetFound = false;
    try {
        const response = await fetch(MTA_FEED_URL, {
            method: 'GET',
            headers: {
                'x-api-key': MTA_API_KEY
            }
        });
        if (!response.ok) {
            console.error(`Error fetching MTA alerts: ${response.statusText}`);
            return;
        }
        const data = await response.json();
        if (data.entity && Array.isArray(data.entity)) {
            data.entity.forEach(displayAlertInfo);
        } else {
            console.log('No alerts found.');
        }
        if (!newSkeetFound) {
            console.log('No new alerts found.');
        }
    } catch (error) {
        console.error(`Error fetching MTA alerts: ${error.message}`);
    }
}

// Log into Bluesky and fetch the recent posts to identify seen alerts
async function loginToBskyAgent() {
    try {
        await agent.login({
            identifier: BSKY_USERNAME,
            password: BSKY_PASSWORD,
        });
        console.log('Logged in to BskyAgent successfully!');
        const response = await agent.getAuthorFeed({ actor: BSKY_USERNAME }, { limit: 50 });
        if (response && response.data && Array.isArray(response.data.feed)) {
            response.data.feed.forEach(post => {
                const postText = post.post.record.text.replace('🚇 ', ''); // Removing the emoji when adding to seenSkeet
                if (!seenSkeet.includes(postText)) {
                    seenSkeet.push(postText);
                }
            });
        }
        // Only retain the last 50 skeets
        if (seenSkeet.length > 50) {
            seenSkeet = seenSkeet.slice(-50);
        }
    } catch (error) {
        console.error('Error logging in to BskyAgent:', error.message);
    }
}

// Process MTA alerts and decide if they're new and active
async function displayAlertInfo(alertItem) {
    const { alert } = alertItem;
    if (!alert) return;

    const excludedAlertTypes = [
        "Planned - Part Suspended",
        "Planned - Stations Skipped",
        "Planned - Trains Rerouted",
        "Planned - Local to Express",
        "Planned - Express to Local"
    ];

    const alertType = alert.extension && alert.extension["transit_realtime.mercury_alert"] && alert.extension["transit_realtime.mercury_alert"].alert_type;

    // Include "Delays" and "Part Suspended" and exclude the types from the excludedAlertTypes array
    if (!alertType || !(alertType === "Delays" || alertType === "Part Suspended") || excludedAlertTypes.includes(alertType)) return;

    const { active_period, header_text } = alert;
    if (!active_period || !header_text) return;

    const currentTime = Date.now();
    const isAlertActive = active_period.some(period => {
        const hasStarted = currentTime >= period.start * 1000;
        const hasNotEnded = !period.end || currentTime <= period.end * 1000;
        return hasStarted && hasNotEnded;
    });
    if (!isAlertActive) return;

    const title = header_text.translation[0]?.text;
    if (!seenSkeet.includes(title)) {
        newSkeetFound = true;
        console.log('New skeet:', title);
        seenSkeet.push(title);
        if (seenSkeet.length > 50) {
            seenSkeet = seenSkeet.slice(-50);
        }
        postSkeetToBsky(title); // Emoji will be added in the postSkeetToBsky function
    }
}

// Initialize and start the bot
async function startBot() {
    await loginToBskyAgent();
    await fetchMTAAlerts();
}

// Vercel serverless function
export default async (_req, res) => {
    await startBot();
    res.status(200).send('Bot executed successfully.');
};
