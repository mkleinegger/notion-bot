//import modules
require("dotenv").config();
const process = require("process");
const { logger } = require("./logger");
const { fetchPages, createPages, updatePage } = require("./notionAPIHelper");
const { fetchEvents, createEvent, updateEvent } = require("./googleAPIHelper");

console.log = console.error = logger;

//needs evaluation after every semester
const dictScheduleTyp = {
  Vorlesung: "VO",
  Uebung: "UE",
  Pruefung: "Prüfung",
  Abgabegespraech: "Abgabegespräch",
  Vorbesprechung: "VO",
  183239: "VO",
};
let additionalAdds = false; //flag if additional courses or locations have been added
let courses = []; //courses-array

/** selects course for given event and creates it if not found */
async function getCourse(event) {
  //select course
  let course = courses.find(
    (c) =>
      event.summary ==
      c.properties["Course-Number"]["rich_text"][0]["plain_text"] +
        " " +
        c.properties["Type"]["select"]["name"] +
        " " +
        c.properties["Name"]["title"][0]["plain_text"]
  );

  if (
    (course == null || course == undefined) &&
    event.summary.match(
      "^([a-zA-Z]|[0-9]){3}\\.([a-zA-Z]|[0-9]){3}\\s[A-Z]{2}\\s[a-zA-Z]+"
    )
  ) {
    let data = event.summary.split(" ");
    course = await createPages(process.env.NOTION_DATABASE_COURSES_ID, {
      Name: {
        title: [
          {
            text: {
              content: data.slice(2).join(" "),
            },
          },
        ],
      },
      Type: {
        select: {
          name: data[1],
        },
      },
      "Course-Number": {
        rich_text: [
          {
            text: {
              content: data[0],
            },
          },
        ],
      },
    });

    if (course) {
      additionalAdds = true;
      course.push(course);

      console.log(
        `getCourse ~ course ${data.slice(2).join(" ")} has been created`
      );
    }
  }

  return course;
}

async function main() {
  console.log("main ~ start fetching data...");
  // load Data from Notion
  courses = await fetchPages(process.env.NOTION_DATABASE_COURSES_ID);
  let todos = await fetchPages(process.env.NOTION_DATABASE_TODOS_ID, {
    and: [
      {
        property: "synchronizedToGoogle",
        checkbox: {
          equals: false,
        },
      },
      {
        or: [
          {
            property: "Status",
            select: {
              equals: "To Do",
            },
          },
          {
            property: "Status",
            select: {
              equals: "Doing",
            },
          },
        ],
      },
    ],
  });
  let schedules = await fetchPages(process.env.NOTION_DATABASE_SCHEDULES_ID, {
    property: "Dates",
    date: {
      on_or_after: new Date().toISOString(),
    },
  });
  //load Data from Google
  let eventsResp = await fetchEvents(process.env.GOOGLE_CALENDAR_ID);
  console.log("main ~ ...finish fetching data");

  /** synchronize Todos */
  //Future improvements is to change from events to tasks
  for (let todo of todos) {
    console.log(
      `main ~ start synchronizing todo ${todo.properties["Title"]["title"][0]["plain_text"]} with id ${todo.id} to google...`
    );

    let result = await createEvent(process.env.GOOGLE_CALENDAR_ID_TODOS, {
      title: todo.properties["Title"]["title"][0]["plain_text"],
      time: todo.properties["Due to"]["date"]["start"],
      url: todo.url,
    });

    if (result) {
      result = await updatePage(process.env.NOTION_DATABASE_TODOS_ID, todo, {
        synchronizedToGoogle: {
          checkbox: true,
        },
      });

      console.log(
        `main ~ ...finished synchronizing todo ${todo.properties["Title"]["title"][0]["plain_text"]} with id ${todo.id} to google`
      );
    }
  }

  /** synchronize Events */
  //filter all unsynchronized-events and sort by course-name
  let unsynchronisedEvents = eventsResp.data.items
    .filter((e) =>
      e.extendedProperties
        ? e.extendedProperties.private["synchronizedToNotion"] == "false"
        : true
    )
    .sort((a, b) => {
      if (a.summary < b.summary) {
        return -1;
      }
      if (a.summary > b.summary) {
        return 1;
      }
      return (
        new Date(a.start.dateTime ?? a.start.date) -
        new Date(b.start.dateTime ?? b.start.date)
      );
    });

  let lastEvent = null; //flag to see if courses change
  let course = null; //current course
  let lastNumbers = null; //last #-numbers for notion entries

  for (let event of unsynchronisedEvents) {
    console.log(
      `main ~ start synchronizing event ${event.summary} with id ${event.id} to notion...`
    );
    //check if event-type should be even synchronized
    if (dictScheduleTyp[event.description]) {
      //select course
      if (lastEvent == null || lastEvent.summary != event.summary) {
        course = await getCourse(event);

        if (course) {
          //reset count
          lastNumbers = {
            VO: 1,
            UE: 1,
            Pruefung: 1,
            Abgabegespraech: 1,
          };

          //check for the last number used for each type
          let type = course.properties["Type"]["select"]["name"];
          let filteredSchedules = schedules.filter(
            (s) => s.properties["Course"]["relation"][0]["id"] == course.id
          );

          for (let schedule of filteredSchedules) {
            let currentNumber = parseInt(
              schedule.properties["Name"]["title"][0]["plain_text"].substring(1)
            );

            if (currentNumber > lastNumbers[type])
              lastNumbers[type] = currentNumber + 1;
          }
        }
      }

      if (course) {
        //create Schedule in Notion
        let resultNotionInsert = await createPages(
          process.env.NOTION_DATABASE_SCHEDULES_ID,
          {
            Location: {
              rich_text: [
                {
                  text: {
                    content: event.location,
                  },
                },
              ],
            },
            Course: {
              relation: [
                {
                  id: course.id,
                },
              ],
            },
            Dates: {
              date: {
                start: event.start.dateTime ?? event.start.date,
                end: event.end.dateTime ?? event.end.date,
              },
            },
            Name: {
              title: [
                {
                  text: {
                    content:
                      "#" + lastNumbers[dictScheduleTyp[event.description]]++,
                  },
                },
              ],
            },
            Type: {
              select: {
                name: dictScheduleTyp[event.description] ?? "VO",
              },
            },
            Finished: {
              checkbox: false,
            },
          }
        );

        if (resultNotionInsert) {
          console.log(
            `main ~ ...new schedule ${resultNotionInsert.id} has been added`,
            resultNotionInsert
          );

          let resultUpdateEvent = await updateEvent(
            process.env.GOOGLE_CALENDAR_ID,
            event
          );

          console.log(
            `main ~ event ${event.id} has been updated`,
            resultUpdateEvent
          );
        }
      }
    } else {
      let resultUpdateEvent = await updateEvent(
        process.env.GOOGLE_CALENDAR_ID,
        event
      );

      console.log(
        `main ~ event ${event.id} has been updated`,
        resultUpdateEvent
      );
    }

    lastEvent = event;

    console.log(
      `main ~ ...finished synchronizing event ${event.summary} with id ${event.id} to notion`
    );
  }

  //if needed use same structure to fetch events from a working calender and add it to the schedule

  if (additionalAdds) {
    //console.log("add todo for checking new updated items");
  }
}

main();
