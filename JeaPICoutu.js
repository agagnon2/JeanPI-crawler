import axios from "axios";
import beeper from "beeper";
import open from "open";

// debug preference
let LOGS = false;
process.argv.forEach(function (val, index, array) {
  if ((val = "debug=true")) {
    LOGS = true;
  }
});

/** CONSTANTS */
const MAX_STORE_NUMBER = 350;
const MAX_STORE_PER_REQUEST = 9;
const WAIT_BEFORE_POST_MS = 1;
const BASE_HEADERS = {
  "Content-Type": "application/json",
};
const APPOINTMENTS_URL = `https://www.jeancoutu.com/api/appointment/en/GetStoreServiceAvailabilitiesSummary`;
const STORE_URL = `https://www.jeancoutu.com/StoreLocator/StoreLocator.svc/LoadStoreServicesInfos`;
const generateStoresArray = (start, end) => {
  return Array(end - start)
    .fill()
    .map((_, idx) => start + idx);
};

/**VARIABLES */
let availabilityDictionnary = new Object();
let allAvailabilities = [];

/* MAIN */
(async () => {
  const date1 = new Date();
  const storelist = await getStoreWithAvailabilities();
  const date2 = new Date();

  console.log(
    `I interrogated ${MAX_STORE_NUMBER} stores in ${
      date2.getTime() - date1.getTime()
    } ms and got ${
      Object.keys(availabilityDictionnary).length
    } availability results \n${JSON.stringify(availabilityDictionnary)}`
  );
})();

/** FUNCTIONS */
async function getStoreWithAvailabilities() {
  let cpt = 0;

  while (cpt < MAX_STORE_NUMBER) {
    await fetchAvailabilities(
      generateStoresArray(cpt, cpt + MAX_STORE_PER_REQUEST - 1)
    ).then((res) => {
      res.forEach(async (element) => {
        let info = await getStoreinfo(element.StoreId);

        availabilityDictionnary[element.StoreId] = {
          id: element.StoreId,
          ...info,
          logs: element.AvailabilityDump,
        };
      });
    });

    cpt = cpt + MAX_STORE_PER_REQUEST;
    new Promise((r) => setTimeout(r, WAIT_BEFORE_POST_MS));
  }
  await beeper(2);
}

async function getStoreinfo(storeId) {
  try {
    let response = await axios.post(
      STORE_URL,
      {
        storeNumber: storeId,
      },
      {
        headers: BASE_HEADERS,
      }
    );
    if (response.status == 200) {
      const storeinfo =
        response.data.LoadStoreServicesInfosResult.StoreBasicInfo;
      return {
        name: storeinfo.Store_Name,
        address: `${storeinfo.Address_f}, ${storeinfo.City}, ${storeinfo.Zip_Code}`,
        phone: storeinfo.Front_Phone,
      };
    }
  } catch {
    if (LOGS) console.log(`error while getting store #${storeId} info`);
  }
}

async function fetchAvailabilities(stores) {
  let response = await axios.post(
    APPOINTMENTS_URL,
    {
      ServiceId: 894,
      NbPersons: 1,
      StoreList: [...stores],
    },
    {
      headers: BASE_HEADERS,
    }
  );
  if (response.status == 200) {
    let storeAvailability = [];
    await response.data.Body?.ScheduleAvailabilities.forEach((element) => {
      if (
        (element.AvailabilityDate != null &&
          element.IsAvailableNightAndMorning) ||
        element.IsAvailableAfterNoon ||
        element.IsAvailableEvening
      ) {
        storeAvailability.push({
          StoreId: element.StoreId,
          AvailabilityDate: element.AvailabilityDate,
          AvailabilityDump: {
            IsAvailableAfterNoon: element.IsAvailableAfterNoon,
            IsAvailableEvening: element.IsAvailableEvening,
            AvailabilityTimes: element.AvailabilityTimes,
            PreviousDateAvailable: element.PreviousDateAvailable,
            NextDateAvailable: element.NextDateAvailable,
          },
        });
      }
    });
    return storeAvailability;
  } else {
    return [];
  }
}
