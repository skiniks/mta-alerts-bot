import axios from 'axios'
import bsky from '@atproto/api'
import { createClient } from '@supabase/supabase-js'

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'MTA_API_KEY', 'MTA_API_URL', 'BSKY_USERNAME', 'BSKY_PASSWORD']
requiredEnvVars.forEach((varName) => {
    if (!process.env[varName])
        throw new Error(`Missing required environment variable: ${varName}`)
})

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const API_KEY = process.env.MTA_API_KEY
const ALERT_FEED_URL = process.env.MTA_API_URL
const bskyUsername = process.env.BSKY_USERNAME
const bskyPassword = process.env.BSKY_PASSWORD

const supabase = createClient(supabaseUrl, supabaseKey)

const agent = new bsky.BskyAgent({
    service: 'https://bsky.social',
})

function formatAlertText(entity) {
    if (!entity?.alert?.header_text?.translation)
        return null;

    const headerTranslations = entity.alert.header_text.translation;
    const headerTranslation = headerTranslations.find(t => t.language === 'en');

    if (!headerTranslation)
        return null;

    const headerText = `🚇 ${headerTranslation.text}`;

    return {
        text: headerText,
        id: entity.id,
        headerTranslation: headerText,
    };
}

function isValidAlert(entity) {
    if (!entity.alert || !entity.alert.header_text || entity.id.startsWith('lmm:planned_work'))
        return false

    return true
}

async function isAlertDuplicate(alertId) {
    const { data, error } = await supabase
        .from('mta_alerts')
        .select('*')
        .eq('alert_id', alertId)
        .limit(1)

    if (error) {
        console.error('Error checking for duplicate alert:', error)
        return true
    }

    return data.length > 0
}


async function postAlertToBsky(formattedAlert) {
    const truncatedText = formattedAlert.text.slice(0, 300)
    await agent.post({
        $type: 'app.bsky.feed.post',
        text: truncatedText,
        createdAt: new Date().toISOString(),
        alertId: formattedAlert.id,
    })

    // eslint-disable-next-line no-console
    console.log('New alert posted:', truncatedText)
}

async function insertAlertToDb(formattedAlert) {
    const { error: insertError } = await supabase.from('mta_alerts').insert({
        alert_id: formattedAlert.id,
        header_translation: formattedAlert.headerTranslation,
    })

    if (insertError) {
        console.error('Error inserting alert into Supabase:', insertError)
        return false
    }

    return true
}

async function fetchAlerts() {
    try {
        const response = await axios.get(ALERT_FEED_URL, {
            headers: { 'x-api-key': API_KEY },
        })

        const data = response.data

        if (!data || !data.entity) {
            console.warn('Unexpected data structure:', data)
            return
        }

        let foundNewAlert = false

        if (Array.isArray(data.entity)) {
            for (const entity of data.entity) {
                const formattedAlert = formatAlertText(entity)
                if (!formattedAlert)
                    continue

                if (isValidAlert(entity)) {
                    const isDuplicate = await isAlertDuplicate(formattedAlert.id)
                    if (!isDuplicate) {
                        await postAlertToBsky(formattedAlert)
                        const inserted = await insertAlertToDb(formattedAlert)
                        if (inserted)
                            foundNewAlert = true
                    }
                }
            }
        }
        else {
            console.warn('data.entity is not an array:', data.entity)
        }
        if (!foundNewAlert)
            // eslint-disable-next-line no-console
            console.log('No new alerts')
    }
    catch (error) {
        console.error('Error fetching MTA alerts:', error.message)
    }
}


export default async function handler(_req, res) {
    try {
        await agent.login({
            identifier: bskyUsername,
            password: bskyPassword,
        })

        await fetchAlerts()
        res.status(200).send('OK')
    }
    catch (error) {
        console.error('Error in handler:', error)
        res.status(500).send('An error occurred while processing your request.')
    }
}
