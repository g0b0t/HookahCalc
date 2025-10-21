import React from "react";
import { repo } from "../storage/localRepo";

export default function SettingsScreen() {
  return (
    <div className="wrap">
      <header><div className="title">Настройки</div></header>
      <section>
        <div className="section-title">Резервное копирование</div>
        <div className="row">
          <button className="secondary" onClick={() => {
            const blob = repo.exportJson();
            const stamp = new Date().toISOString().replace(/[:.]/g,"-");
            const filename = `hookah-split-${stamp}.json`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
          }}>Экспорт JSON</button>

          <label className="file">
            Импорт JSON
            <input type="file" accept="application/json" onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              try {
                repo.importJson(text);
                alert("Импортировано, перезагрузите страницу");
              } catch(e:any) {
                alert("Ошибка: " + e.message);
              }
            }} />
          </label>
        </div>
      </section>
    </div>
  );
}
