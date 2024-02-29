import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'
const path = require('path')
const fs = require('fs').promises

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json') // Update the path as necessary

const TOKEN_PATH = 'token.json' // Update the path as necessary

export default async function handler(req, res) {
	try {
		console.log('inside server')
		const auth = await authorize()

		if (auth) {
			const events = await listEvents(auth)

			res.status(200).json(events)
		} else {
			res.status(401).json({ error: 'Authentication failed' })
		}
	} catch (error) {
		console.error('Error:', error)
		res.status(500).json({ error: 'Internal server error' })
	}
}

async function authorize() {
	try {
		const client = await loadSavedCredentialsIfExist()

		if (client) {
			return client
		}

		const newClient = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH })

		if (newClient.credentials) {
			await saveCredentials(newClient)
			return newClient
		}

		return null
	} catch (error) {
		console.error('Authorization error:', error)
		return null
	}
}

let savedCredentialsPayload = null // Declare a variable to store the credentials payload

/**
 * Serializes credentials to a variable.
 *
 * @param {OAuth2Client} client
 * @return {void}
 */
async function saveCredentials(client) {
	try {
		const keysContent = process.env.CREDENTIALS_JSON // Assuming you set your credentials JSON as an environment variable
		const keys = JSON.parse(keysContent)
		const key = keys.installed || keys.web
		const payload = JSON.stringify({
			type: 'authorized_user',
			client_id: key.client_id,
			client_secret: key.client_secret,
			refresh_token: client.credentials.refresh_token,
		})
		await fs.writeFile(TOKEN_PATH, payload)
	} catch (error) {
		console.error('Error saving credentials:', error)
	}
}

/**
 * Reads previously authorized credentials from the saved payload variable.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
	// try {
	// 	if (savedCredentialsPayload) {
	// 		const credentials = JSON.parse(savedCredentialsPayload)
	// 		return google.auth.fromJSON(credentials)
	// 	} else {
	// 		return null
	// 	}
	// } catch (error) {
	// 	console.error('Error loading credentials:', error)
	// 	return null
	// }
	try {
		const content = await fs.readFile(TOKEN_PATH)
		const credentials = JSON.parse(content)
		return google.auth.fromJSON(credentials)
	} catch (err) {
		return null
	}
}

async function listEvents(auth) {
	const calendar = google.calendar({ version: 'v3', auth })
	const res = await calendar.events.list({
		calendarId: '5f6aa2d22a8c4813f29b4fc16a12695bc1cf8930e6004e37fe65c17d3f90f047@group.calendar.google.com', // Replace with your calendar ID
		timeMin: new Date().toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime',
	})
	return res.data.items || []
}
