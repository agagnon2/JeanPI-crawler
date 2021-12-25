import axios from "axios";

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
let showHttpLogs = false;

/** INTERFACES */
interface AvailabilityInfo {
  IsAvailableAfterNoon: boolean;
  IsAvailableEvening: boolean;
  IsAvailableNightAndMorning: boolean;
  AvailabilityTimes: string;
  PreviousDateAvailable: boolean;
  NextDateAvailable: string;
}
interface StoreListObj {
  StoreId: string;
  AvailabilityDate: string;
  Availabilityinfo: AvailabilityInfo;
}

interface RestStoreinfo {
  name: string;
  address: string;
  phone: string;
}

interface StoreInfo extends RestStoreinfo {
  id: string;
  logs: AvailabilityInfo;
}

/**CONSTANT FUNCTION */
const generateStoresArray = (start: number, end: number): number[] => {
  var numbers = [];
  for (var i = start; i <= end; i++) {
    numbers.push(i);
  }
  return numbers;
};
const getStoreWithAvailabilities = async () => {
  let cpt = 0;
  let availableDict: { [key: string]: StoreInfo } = {};

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
        const storeInfo: RestStoreinfo = await getStoreinfo(
          storeAvailable.StoreId
        );

        availableDict[storeAvailable.StoreId] = {
          id: storeAvailable.StoreId,
          ...storeInfo,
          logs: storeAvailable.Availabilityinfo,
        };
      });
    });

    cpt = cpt + MAX_STORE_PER_REQUEST;
    new Promise((r) => setTimeout(r, WAIT_BEFORE_POST_MS));
  }
  return availableDict;
};
const fetchAvailabilities = async (
  stores: number[]
): Promise<StoreListObj[]> => {
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

  if (response.status === 200) {
    let storeAvailability: StoreListObj[] = [];

    await response.data.Body?.ScheduleAvailabilities.forEach(
      (element: StoreListObj) => {
        if (
          (element.AvailabilityDate != null &&
            element.Availabilityinfo?.IsAvailableNightAndMorning) ||
          element.Availabilityinfo?.IsAvailableAfterNoon ||
          element.Availabilityinfo?.IsAvailableEvening
        ) {
          storeAvailability.push({
            StoreId: element.StoreId,
            AvailabilityDate: element.AvailabilityDate,
            Availabilityinfo: {
              IsAvailableNightAndMorning:
                element.Availabilityinfo?.IsAvailableNightAndMorning,
              IsAvailableAfterNoon:
                element.Availabilityinfo?.IsAvailableAfterNoon,
              IsAvailableEvening: element.Availabilityinfo?.IsAvailableEvening,
              AvailabilityTimes: element.Availabilityinfo?.AvailabilityTimes,
              PreviousDateAvailable:
                element.Availabilityinfo?.PreviousDateAvailable,
              NextDateAvailable: element.Availabilityinfo?.NextDateAvailable,
            },
          });
        }
      }
    );
    return storeAvailability;
  } else {
    console.error("fetchAvailabilities failed ");
    return Promise.resolve([]);
  }
};

const getStoreinfo = async (storeId: string): Promise<RestStoreinfo> => {
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
    if (response.status === 200) {
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
    console.error(`error while getting store #${storeId} info`);
  }
  return Promise.resolve({} as RestStoreinfo);
};

/* MAIN */
const getAllStores = (async (
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
      } ms and got ${Object.keys(storelist).length} availability results\n`
    );

    for (const [key, value] of Object.entries(storelist)) {
      console.log(`${key}: ${value["name"]} @ ${value["address"]}`);
    }
  }

  return storelist;
})();

export const Jeanpi = {
  getAllStores,
};
