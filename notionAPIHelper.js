//require notion-client, logger
const { Client } = require("@notionhq/client");
const { logger } = require("./logger");

console.log = console.error = logger;

//initialization
const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
});

/** fetches pages from the specified Database from notion */
exports.fetchPages = async function (database_id, filter) {
  try {
    let fetchObject = { database_id: database_id };

    if (filter) {
      fetchObject.filter = filter;
    }

    const response = await notion.databases.query(fetchObject);
    return response.results;
  } catch (error) {
    console.error(
      `fetchPages ~ error occured when fetching pages from databaseId ${database_id} `,
      error
    );

    return [];
  }
};

/** creates page in the specified Database from notion */
exports.createPages = async function (database_id, body) {
  try {
    return await notion.pages.create({
      parent: {
        database_id: database_id,
      },
      properties: body,
    });
  } catch (error) {
    console.error(
      `createPages ~ error occured when creating page for databaseId ${database_id} `,
      error
    );
    return null;
  }
};

/** creates page in the specified Database from notion */
exports.updatePage = async function (database_id, body, property) {
  try {
    return await notion.pages.update({
      parent: {
        database_id: database_id,
      },
      page_id: body.id,
      properties: property,
    });
  } catch (error) {
    console.error(
      `updatePage ~ error occured when updating page ${body.id} for databaseId ${database_id} `,
      error
    );
    return null;
  }
};
