import { useState } from 'react'
import './App.css'
import SessionScreen from "./ui/SessionScreen";
import SummaryScreen from "./ui/SummaryScreen";
import SettingsScreen from "./ui/SettingsScreen";
import { getTelegramCtx } from "./telegram";


function App() {
  const [tab, setTab] = useState<"session"|"summary"|"settings">("session");
  const { inTelegram } = getTelegramCtx();

  return (
    <div className="app">
      {!inTelegram && <div className="dev">DEV: вы не в Telegram, запущен мок-режим</div>}
      <nav className="tabs">
        <button className={tab==="session"?"on":""} onClick={()=>setTab("session")}>Сессия</button>
        <button className={tab==="summary"?"on":""} onClick={()=>setTab("summary")}>Итоги</button>
        <button className={tab==="settings"?"on":""} onClick={()=>setTab("settings")}>Настройки</button>
      </nav>
      {tab==="session"  && <SessionScreen/>}
      {tab==="summary"  && <SummaryScreen/>}
      {tab==="settings" && <SettingsScreen/>}
    </div>
  );
}

export default App