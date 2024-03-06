import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
const SERVICE_ACCOUNT_KEY = process.env.CREDS

export default async function handler(req, res) {
	try {
		console.log('inside server')
		const auth = await getAuth()

		const events = await listEvents(auth)
		res.status(200).json(events)
	} catch (error) {
		console.error('Error:', error)
		res.status(500).json({ error: 'Internal server error' })
	}
}

async function getAuth() {
	try {
		const credentials = JSON.parse(SERVICE_ACCOUNT_KEY)

		const auth = new google.auth.GoogleAuth({
			credentials,
			scopes: SCOPES,
		})

		return auth.getClient()
	} catch (error) {
		console.error('Error loading service account credentials:', error)
		return null
	}
}

async function listEvents(auth) {
	const calendar = google.calendar({ version: 'v3', auth })
	const res = await calendar.events.list({
		calendarId: 'b3c47233db7d035dfbd4d0052f7224bbfb63cefd6de0d9d72a0c11123141913f@group.calendar.google.com',
		timeMin: new Date().toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime',
	})
	return res.data.items || []
}
