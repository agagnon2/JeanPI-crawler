import axios from "axios";
import beeper from "beeper";
import open from "open";

/**GLOBAL CONSTANTS */
const MAX_STORE_NUMBER = 350;
const MAX_STORE_PER_REQUEST = 9;
const WAIT_BEFORE_POST_MS = 1;
const BASE_HEADERS = {
  "Content-Type": "application/json",
};
const APPOINTMENTS_URL = `https://www.jeancoutu.com/api/appointment/en/GetStoreServiceAvailabilitiesSummary`;
const STORE_URL = `https://www.jeancoutu.com/StoreLocator/StoreLocator.svc/LoadStoreServicesInfos`;

/**GLOBAL VARIABLES */
let showOutcomeLogs = true;
let showHttpLogs = true;

/**CONSTANT FUNCTION */
const generateStoresArray = (start, end) => {
  return Array(end - start)
    .fill()
    .map((_, idx) => start + idx);
};
const getStoreWithAvailabilities = async () => {
  let cpt = 0;
  let availableDict = new Object();
  while (cpt < MAX_STORE_NUMBER) {
    if (showHttpLogs)
      console.log(
        `fetchAvailabilities store # ${cpt} to ${
          cpt + MAX_STORE_PER_REQUEST - 1
        }`
      );

    await fetchAvailabilities(
      generateStoresArray(cpt, cpt + MAX_STORE_PER_REQUEST - 1)
    ).then((res) => {
      res.forEach(async (storeAvailable) => {
        let storeInfo = await getStoreinfo(storeAvailable.StoreId);

        availableDict[storeAvailable.StoreId] = {
          id: storeAvailable.StoreId,
          ...storeInfo,
          logs: storeAvailable.AvailabilityDump,
        };
      });
    });

    cpt = cpt + MAX_STORE_PER_REQUEST;
    new Promise((r) => setTimeout(r, WAIT_BEFORE_POST_MS));
  }
  await beeper(2);
  return availableDict;
};
const fetchAvailabilities = async (stores) => {
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
};

const getStoreinfo = async (storeId) => {
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
    if (showHttpLogs) console.log(`error while getting store #${storeId} info`);
  }
};

/* MAIN */
export const getAllStores = (async (
  _showOutcomeLogs = showOutcomeLogs,
  _showHttpLogs = showHttpLogs
) => {
  showOutcomeLogs = _showOutcomeLogs;
  showHttpLogs = _showHttpLogs;

  const timestamp1 = new Date();
  const storelist = await getStoreWithAvailabilities();
  const timestamp2 = new Date();

  if (showOutcomeLogs) {
    console.log(
      `I interrogated ${MAX_STORE_NUMBER} stores in ${
        timestamp2.getTime() - timestamp1.getTime()
      } ms and got ${Object.keys(storelist).length} availability results`
    );

    for (const [key, value] of Object.entries(storelist)) {
      console.logs(`${key}: ${value["name"]} @ ${value["address"]}`);
    }
  }

  return storelist;
})();
