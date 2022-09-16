# Notion-GoogleCalender-Synchronization

This script allows to synchronize this [Notion Hub (Template)](https://hypnotic-bladder-14e.notion.site/Hub-07acb095ee6d431aad8e454d08dd6e3b) with your google-calender

## Installation

First, use the package manager [npm](https://www.npmjs.com/) to install all necessary modules .

    npm i

Second create a .env file and enter all those properties

    NOTION_ACCESS_TOKEN=""
    NOTION_DATABASE_TODOS_ID=""
    NOTION_DATABASE_SCHEDULES_ID=""
    NOTION_DATABASE_COURSES_ID=""
    GOOGLE_PRIVATE_KEY=""
    GOOGLE_CLIENT_EMAIL = """
    GOOGLE_PROJECT_NUMBER = ""
    GOOGLE_TASKLIST_ID=""
    GOOGLE_CALENDAR_ID = ""
    GOOGLE_CALENDAR_ID_TODOS = ""
    
To get your NOTION_ACCESS_TOKEN visit [Notion](https://developers.notion.com/docs/authorization) and to get your GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY visit [Google](https://developers.google.com/calendar/api/guides/auth) (use a service account). To get your id, please visit the reference pages from Google and Notion.

## Usage

Use it as a [cron-job](https://wiki.ubuntuusers.de/Cron/) which runs periodically to synchronize your notion-template with your google-calender. Or make small changes to make it run with your own template.

## Additional Information

This is just a simple script which should help me with synchronizing my google-calender and notion-hub. 
Future plans would be intergrating google-tasks-api if they add support for service account at personal tasklists and converting it to and webserver which runs 24/7.