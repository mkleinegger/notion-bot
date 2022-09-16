//require google and logger
const { google } = require("googleapis");
const { logger } = require("./logger");

console.log = console.error = logger;

//initialization
const SCOPES_CALENDER = "https://www.googleapis.com/auth/calendar";
const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY,
  SCOPES_CALENDER
);

const calendarAPI = google.calendar({
  version: "v3",
  project: process.env.GOOGLE_PROJECT_NUMBER,
  auth: jwtClient,
});

/** fetch all Google-Calender Events from the specified calenderId which are in the future */
exports.fetchEvents = async function (calendarId) {
  try {
    return await calendarAPI.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `fetchEvents ~ error occured when fetching pages from calender ${calendarId} `,
      error
    );

    return [];
  }
};

/** Update Event to set a private property that this event has been synchronized to notion */
exports.updateEvent = async function (calendarId, event) {
  try {
    return await calendarAPI.events.update({
      calendarId: calendarId,
      eventId: event.id,
      requestBody: {
        start: event.start,
        end: event.end,
        summary: event.summary,
        location: event.location,
        description: event.description,
        extendedProperties: {
          private: { synchronizedToNotion: true },
        },
      },
    });
  } catch (error) {
    console.error(
      `updateEvent ~ error occured when updating event ${event.id} from calender ${calendarId} `,
      error
    );

    return null;
  }
};

/** Update Event to set a private property that this event has been synchronized to notion */
exports.createEvent = async function (calendarId, body) {
  try {
    return await calendarAPI.events.insert({
      calendarId: calendarId,
      resource: {
        end: {
          dateTime: new Date(body.time).toISOString(),
          timeZone: "Europe/Vienna",
        },
        start: {
          dateTime: new Date(body.time).toISOString(),
          timeZone: "Europe/Vienna",
        },
        extendedProperties: {
          private: { synchronizedToNotion: true },
        },
        summary: "Abgabe - " + body.title,
        reminders: {
          useDefault: true,
        },
        description: "Todo - " + body.url,
      },
    });
  } catch (error) {
    console.error(
      `createEvent ~ error occured when adding event ${body.id} from calender ${calendarId} `,
      error
    );

    return null;
  }
};
