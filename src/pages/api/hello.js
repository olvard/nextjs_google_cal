// pages/api/google-calendar.js

import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
const CREDENTIALS_PATH = 'credentials.json' // Update the path as necessary
const TOKEN_PATH = 'token.json' // Update the path as necessary

export default async function handler(req, res) {
	try {
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

async function loadSavedCredentialsIfExist() {
	try {
		const content = fs.readFileSync(TOKEN_PATH)
		const credentials = JSON.parse(content)
		return google.auth.fromJSON(credentials)
	} catch (err) {
		return null
	}
}

async function saveCredentials(client) {
	try {
		const content = fs.readFileSync(CREDENTIALS_PATH)
		const keys = JSON.parse(content)
		const key = keys.installed || keys.web
		const payload = JSON.stringify({
			type: 'authorized_user',
			client_id: key.client_id,
			client_secret: key.client_secret,
			refresh_token: client.credentials.refresh_token,
		})
		fs.writeFileSync(TOKEN_PATH, payload)
	} catch (error) {
		console.error('Error saving credentials:', error)
	}
}

async function listEvents(auth) {
	const calendar = google.calendar({ version: 'v3', auth })
	const res = await calendar.events.list({
		calendarId: 'primary', // Replace with your calendar ID
		timeMin: new Date().toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime',
	})
	return res.data.items || []
}
