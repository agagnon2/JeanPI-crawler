import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./../App";
import { Jeanpi } from "../../src/jeanpi/JeaPICoutu";
import ReactDOM from "react-dom";
import Button from "@mui/material/Button";

export const StoreScrapper: React.FC = () => {
  const refreshResult = async () => {
    Jeanpi.getAllStores().then((dict) => {
      var arr = [];

      for (var key in dict) {
        if (dict.hasOwnProperty(key)) {
          arr.push([key, dict[key]]);
        }
      }
      return arr;
    });
  };
  let stores;
  useEffect(() => {
    // Create an scoped async function in the hook
    async function awaitStores() {
      stores = await Jeanpi.getAllStores();
      console.log(JSON.stringify(stores));
    }
    awaitStores();
  }, []);
  return (
    <section>
      <Button onClick={refreshResult}>Refresh</Button>
      <div>{stores}</div>
    </section>
  );
};
