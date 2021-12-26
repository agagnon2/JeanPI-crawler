import React, { useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { StoreScrapper } from "./components/jeanCoutuScrapper";
import ReactDOM from "react-dom";
import Button from "@mui/material/Button";

function App() {
  return (
    <section>
      <div className="App ">
        <StoreScrapper />
      </div>
    </section>
  );
}

export default App;
